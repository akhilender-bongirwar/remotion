import {getSamplePositionsFromTrack} from '../../containers/iso-base-media/get-sample-positions-from-track';
import type {JumpMark} from '../../containers/iso-base-media/mdat/calculate-jump-marks';
import type {TrakBox} from '../../containers/iso-base-media/trak/trak';
import {
	getMoofBoxes,
	getTfraBoxes,
} from '../../containers/iso-base-media/traversal';
import type {SamplePosition} from '../../get-sample-positions';
import type {AudioTrack, OtherTrack, VideoTrack} from '../../get-tracks';
import {getTracks} from '../../get-tracks';
import type {ParserState} from '../parser-state';

export type FlatSample = {
	track: VideoTrack | AudioTrack | OtherTrack;
	samplePosition: SamplePosition;
};

export type MinimalFlatSampleForTesting = {
	track: {
		trackId: number;
		timescale: number;
		type: 'audio' | 'video' | 'other';
	};
	samplePosition: {
		dts: number;
		offset: number;
	};
};

export const calculateFlatSamples = (state: ParserState) => {
	const tracks = getTracks(state, true);
	const allTracks = [
		...tracks.videoTracks,
		...tracks.audioTracks,
		...tracks.otherTracks,
	];

	const flatSamples = allTracks.map((track) => {
		const {samplePositions} = getSamplePositionsFromTrack({
			trakBox: track.trakBox as TrakBox,
			moofBoxes: getMoofBoxes(state.structure.getIsoStructure().boxes),
			tfraBoxes: getTfraBoxes(state.structure.getIsoStructure()),
		});

		return samplePositions.map((samplePosition) => {
			return {
				track,
				samplePosition,
			};
		});
	});
	return flatSamples;
};

export const cachedSamplePositionsState = () => {
	const cachedForMdatStart: Record<string, FlatSample[]> = {};
	const jumpMarksForMdatStart: Record<string, JumpMark[]> = {};

	return {
		getSamples: (mdatStart: number) => {
			if (cachedForMdatStart[mdatStart]) {
				return cachedForMdatStart[mdatStart];
			}

			return null;
		},
		setSamples: (mdatStart: number, samples: FlatSample[]) => {
			cachedForMdatStart[mdatStart] = samples;
		},
		setJumpMarks: (mdatStart: number, marks: JumpMark[]) => {
			jumpMarksForMdatStart[mdatStart] = marks;
		},
		getJumpMarks: (mdatStart: number) => {
			return jumpMarksForMdatStart[mdatStart];
		},
	};
};
