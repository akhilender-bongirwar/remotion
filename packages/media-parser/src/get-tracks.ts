import type {
	MatrixCoefficients,
	Primaries,
	TransferCharacteristics,
} from './containers/avc/color';
import {makeBaseMediaTrack} from './containers/iso-base-media/make-track';
import type {MoovBox} from './containers/iso-base-media/moov/moov';
import type {TrakBox} from './containers/iso-base-media/trak/trak';
import {
	getMoovBoxFromState,
	getMvhdBox,
	getTraks,
} from './containers/iso-base-media/traversal';
import type {AllTracks} from './containers/riff/get-tracks-from-avi';
import {
	getTracksFromAvi,
	hasAllTracksFromAvi,
} from './containers/riff/get-tracks-from-avi';
import {
	getTracksFromTransportStream,
	hasAllTracksFromTransportStream,
} from './containers/transport-stream/get-tracks';
import {
	getTracksFromMatroska,
	matroskaHasTracks,
} from './containers/webm/get-ready-tracks';
import type {M3uPlaylistContext} from './options';
import type {IsoBaseMediaState} from './state/iso-base-media/iso-state';
import type {ParserState} from './state/parser-state';
import type {StructureState} from './state/structure';

type SampleAspectRatio = {
	numerator: number;
	denominator: number;
};

export type VideoTrackColorParams = {
	transferCharacteristics: TransferCharacteristics | null;
	matrixCoefficients: MatrixCoefficients | null;
	primaries: Primaries | null;
	fullRange: boolean | null;
};

export type MediaParserVideoCodec =
	| 'vp8'
	| 'vp9'
	| 'h264'
	| 'av1'
	| 'h265'
	| 'prores';

export type MediaParserAudioCodec =
	| 'opus'
	| 'aac'
	| 'mp3'
	| 'ac3'
	| 'vorbis'
	| 'pcm-u8'
	| 'pcm-s16'
	| 'pcm-s24'
	| 'pcm-s32'
	| 'pcm-f32'
	| 'flac'
	| 'aiff';

export type VideoTrack = {
	type: 'video';
	trackId: number;
	description: Uint8Array | undefined;
	timescale: number;
	codec: string;
	codecWithoutConfig: MediaParserVideoCodec;
	m3uStreamFormat: 'ts' | 'mp4' | null;
	sampleAspectRatio: SampleAspectRatio;
	width: number;
	height: number;
	displayAspectWidth: number;
	displayAspectHeight: number;
	codedWidth: number;
	codedHeight: number;
	rotation: number;
	trakBox: TrakBox | null;
	codecPrivate: Uint8Array | null;
	color: VideoTrackColorParams;
	fps: number | null;
};

export type AudioTrack = {
	type: 'audio';
	trackId: number;
	timescale: number;
	codec: string;
	codecWithoutConfig: MediaParserAudioCodec;
	numberOfChannels: number;
	sampleRate: number;
	description: Uint8Array | undefined;
	trakBox: TrakBox | null;
	codecPrivate: Uint8Array | null;
};

export type OtherTrack = {
	type: 'other';
	trackId: number;
	timescale: number;
	trakBox: TrakBox | null;
};

export type Track = VideoTrack | AudioTrack | OtherTrack;

export const getNumberOfTracks = (moovBox: MoovBox): number => {
	const mvHdBox = getMvhdBox(moovBox);
	if (!mvHdBox) {
		return 0;
	}

	return mvHdBox.nextTrackId - 1;
};

export const isoBaseMediaHasTracks = (
	state: ParserState,
	mayUsePrecomputed: boolean,
) => {
	return Boolean(
		getMoovBoxFromState({
			structureState: state.structure,
			isoState: state.iso,
			mp4HeaderSegment: state.m3uPlaylistContext?.mp4HeaderSegment ?? null,
			mayUsePrecomputed,
		}),
	);
};

export const getHasTracks = (
	state: ParserState,
	mayUsePrecomputed: boolean,
): boolean => {
	const structure = state.structure.getStructure();
	if (structure.type === 'matroska') {
		return matroskaHasTracks({
			structureState: state.structure,
			webmState: state.webm,
		});
	}

	if (structure.type === 'iso-base-media') {
		return isoBaseMediaHasTracks(state, mayUsePrecomputed);
	}

	if (structure.type === 'riff') {
		return hasAllTracksFromAvi(state);
	}

	if (structure.type === 'transport-stream') {
		return hasAllTracksFromTransportStream(state);
	}

	if (structure.type === 'mp3') {
		return state.callbacks.tracks.getTracks().length > 0;
	}

	if (structure.type === 'wav') {
		return state.callbacks.tracks.hasAllTracks();
	}

	if (structure.type === 'aac') {
		return state.callbacks.tracks.hasAllTracks();
	}

	if (structure.type === 'flac') {
		return state.callbacks.tracks.hasAllTracks();
	}

	if (structure.type === 'm3u') {
		return state.callbacks.tracks.hasAllTracks();
	}

	throw new Error('Unknown container ' + (structure satisfies never));
};

const getCategorizedTracksFromMatroska = (state: ParserState): AllTracks => {
	const videoTracks: VideoTrack[] = [];
	const audioTracks: AudioTrack[] = [];
	const otherTracks: OtherTrack[] = [];

	const {resolved} = getTracksFromMatroska({
		structureState: state.structure,
		webmState: state.webm,
	});

	for (const track of resolved) {
		if (track.type === 'video') {
			videoTracks.push(track);
		} else if (track.type === 'audio') {
			audioTracks.push(track);
		} else if (track.type === 'other') {
			otherTracks.push(track);
		}
	}

	return {
		videoTracks,
		audioTracks,
		otherTracks,
	};
};

export const getTracksFromMoovBox = (moovBox: MoovBox) => {
	const videoTracks: VideoTrack[] = [];
	const audioTracks: AudioTrack[] = [];
	const otherTracks: OtherTrack[] = [];
	const tracks = getTraks(moovBox);

	for (const trakBox of tracks) {
		const track = makeBaseMediaTrack(trakBox);
		if (!track) {
			continue;
		}

		if (track.type === 'video') {
			videoTracks.push(track);
		} else if (track.type === 'audio') {
			audioTracks.push(track);
		} else if (track.type === 'other') {
			otherTracks.push(track);
		}
	}

	return {
		videoTracks,
		audioTracks,
		otherTracks,
	};
};

export const getTracksFromIsoBaseMedia = ({
	mayUsePrecomputed,
	structure,
	isoState,
	m3uPlaylistContext,
}: {
	structure: StructureState;
	isoState: IsoBaseMediaState;
	m3uPlaylistContext: M3uPlaylistContext | null;
	mayUsePrecomputed: boolean;
}) => {
	const moovBox = getMoovBoxFromState({
		structureState: structure,
		isoState,
		mp4HeaderSegment: m3uPlaylistContext?.mp4HeaderSegment ?? null,
		mayUsePrecomputed,
	});
	if (!moovBox) {
		return {
			videoTracks: [],
			audioTracks: [],
			otherTracks: [],
		};
	}

	return getTracksFromMoovBox(moovBox);
};

export const defaultGetTracks = (parserState: ParserState): AllTracks => {
	const tracks = parserState.callbacks.tracks.getTracks();
	if (tracks.length === 0) {
		throw new Error('No tracks found');
	}

	return {
		audioTracks: tracks.filter((t) => t.type === 'audio'),
		otherTracks: [],
		videoTracks: tracks.filter((t) => t.type === 'video'),
	};
};

export const defaultHasallTracks = (parserState: ParserState): boolean => {
	try {
		defaultGetTracks(parserState);
		return true;
	} catch {
		return false;
	}
};

export const getTracks = (
	state: ParserState,
	mayUsePrecomputed: boolean,
): AllTracks => {
	const structure = state.structure.getStructure();
	if (structure.type === 'matroska') {
		return getCategorizedTracksFromMatroska(state);
	}

	if (structure.type === 'iso-base-media') {
		return getTracksFromIsoBaseMedia({
			isoState: state.iso,
			m3uPlaylistContext: state.m3uPlaylistContext,
			structure: state.structure,
			mayUsePrecomputed,
		});
	}

	if (structure.type === 'riff') {
		return getTracksFromAvi(structure, state);
	}

	if (structure.type === 'transport-stream') {
		return getTracksFromTransportStream(state);
	}

	if (
		structure.type === 'mp3' ||
		structure.type === 'wav' ||
		structure.type === 'flac' ||
		structure.type === 'aac' ||
		structure.type === 'm3u'
	) {
		return defaultGetTracks(state);
	}

	throw new Error(`Unknown container${structure satisfies never}`);
};
