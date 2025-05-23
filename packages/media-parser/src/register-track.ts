import {addAvcProfileToTrack} from './add-avc-profile-to-track';
import type {AudioTrack, Track, VideoTrack} from './get-tracks';
import type {LogLevel} from './log';
import {Log} from './log';
import type {MediaParserContainer} from './options';
import type {TracksState} from './state/has-tracks-section';
import type {ParserState} from './state/parser-state';
import type {CallbacksState} from './state/sample-callbacks';
import type {OnAudioTrack, OnVideoTrack} from './webcodec-sample-types';

export const registerVideoTrack = async ({
	track,
	container,
	logLevel,
	onVideoTrack,
	registerVideoSampleCallback,
	tracks,
}: {
	track: Track;
	container: MediaParserContainer;
	logLevel: LogLevel;
	onVideoTrack: OnVideoTrack | null;
	registerVideoSampleCallback: CallbacksState['registerVideoSampleCallback'];
	tracks: TracksState;
}) => {
	if (tracks.getTracks().find((t) => t.trackId === track.trackId)) {
		Log.trace(logLevel, `Track ${track.trackId} already registered, skipping`);
		return null;
	}

	if (track.type !== 'video') {
		throw new Error('Expected video track');
	}

	tracks.addTrack(track);

	if (!onVideoTrack) {
		return null;
	}

	const callback = await onVideoTrack({
		track,
		container,
	});

	await registerVideoSampleCallback(track.trackId, callback ?? null);

	return callback;
};

export const registerAudioTrack = async ({
	track,
	container,
	tracks,
	logLevel,
	onAudioTrack,
	registerAudioSampleCallback,
}: {
	track: AudioTrack;
	container: MediaParserContainer;
	tracks: TracksState;
	logLevel: LogLevel;
	onAudioTrack: OnAudioTrack | null;
	registerAudioSampleCallback: CallbacksState['registerAudioSampleCallback'];
}) => {
	if (tracks.getTracks().find((t) => t.trackId === track.trackId)) {
		Log.trace(logLevel, `Track ${track.trackId} already registered, skipping`);
		return null;
	}

	if (track.type !== 'audio') {
		throw new Error('Expected audio track');
	}

	tracks.addTrack(track);
	if (!onAudioTrack) {
		return null;
	}

	const callback = await onAudioTrack({
		track,
		container,
	});
	await registerAudioSampleCallback(track.trackId, callback ?? null);

	return callback;
};

export const registerVideoTrackWhenProfileIsAvailable = ({
	state,
	track,
	container,
}: {
	state: ParserState;
	track: VideoTrack;
	container: MediaParserContainer;
}) => {
	state.riff.registerOnAvcProfileCallback(async (profile) => {
		await registerVideoTrack({
			track: addAvcProfileToTrack(track, profile),
			container,
			logLevel: state.logLevel,
			onVideoTrack: state.onVideoTrack,
			registerVideoSampleCallback: state.callbacks.registerVideoSampleCallback,
			tracks: state.callbacks.tracks,
		});
	});
};
