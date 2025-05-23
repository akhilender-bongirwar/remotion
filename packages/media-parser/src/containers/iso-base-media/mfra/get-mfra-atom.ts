import type {MediaParserController} from '../../../controller/media-parser-controller';
import type {PrefetchCache} from '../../../fetch';
import {getArrayBufferIterator} from '../../../iterator/buffer-iterator';
import type {LogLevel} from '../../../log';
import type {ParseMediaSrc} from '../../../options';
import type {ReaderInterface} from '../../../readers/reader';

export const getMfraAtom = async ({
	src,
	contentLength,
	readerInterface,
	controller,
	parentSize,
	logLevel,
	prefetchCache,
}: {
	src: ParseMediaSrc;
	contentLength: number;
	readerInterface: ReaderInterface;
	controller: MediaParserController;
	parentSize: number;
	logLevel: LogLevel;
	prefetchCache: PrefetchCache;
}) => {
	const result = await readerInterface.read({
		controller,
		range: [contentLength - parentSize, contentLength - 1],
		src,
		logLevel,
		prefetchCache,
	});

	const iterator = getArrayBufferIterator(new Uint8Array(), parentSize);
	while (true) {
		const res = await result.reader.reader.read();
		if (res.value) {
			iterator.addData(res.value);
		}

		if (res.done) {
			break;
		}
	}

	return iterator;
};
