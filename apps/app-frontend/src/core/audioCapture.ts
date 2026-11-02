/** Windows / system audio capture for live background (Chromium getDisplayMedia + system audio). */
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let captureStream: MediaStream | null = null
let freqData: Uint8Array | null = null
let smoothBins: number[] = []
let audioLevel = 0
let bassLevel = 0
let midLevel = 0
const BIN_DRAW = 48
let enabled = false

export function isAudioCaptureActive() {
	return enabled && !!analyser
}

export function getAudioState() {
	return { audioLevel, bassLevel, midLevel, smoothBins, active: isAudioCaptureActive(), binCount: BIN_DRAW }
}

export async function connectSystemAudio(): Promise<boolean> {
	await stopSystemAudio()
	try {
		const stream = await navigator.mediaDevices.getDisplayMedia({
			video: { width: 16, height: 16, frameRate: 1 },
			audio: true,
			// @ts-expect-error Chromium
			systemAudio: 'include',
		} as DisplayMediaStreamOptions)

		for (const track of stream.getVideoTracks()) {
			track.stop()
			stream.removeTrack(track)
		}
		if (!stream.getAudioTracks().length) {
			stream.getTracks().forEach((t) => t.stop())
			return false
		}
		stream.getAudioTracks()[0].addEventListener('ended', () => {
			void stopSystemAudio()
		})

		captureStream = stream
		audioCtx = new AudioContext()
		const src = audioCtx.createMediaStreamSource(stream)
		analyser = audioCtx.createAnalyser()
		analyser.fftSize = 512
		analyser.smoothingTimeConstant = 0.55
		src.connect(analyser)
		freqData = new Uint8Array(analyser.frequencyBinCount)
		smoothBins = new Array(BIN_DRAW).fill(0)
		enabled = true
		return true
	} catch {
		await stopSystemAudio()
		return false
	}
}

export async function stopSystemAudio() {
	enabled = false
	try {
		captureStream?.getTracks().forEach((t) => t.stop())
	} catch {
		/* */
	}
	captureStream = null
	try {
		await audioCtx?.close()
	} catch {
		/* */
	}
	audioCtx = null
	analyser = null
	freqData = null
	audioLevel = 0
	bassLevel = 0
	midLevel = 0
}

export function sampleSystemAudio(opts: { sensitivity: number; bass: number; smooth: number }) {
	const smooth = Math.min(0.95, Math.max(0.1, opts.smooth))
	if (!enabled || !analyser || !freqData) {
		audioLevel *= smooth
		bassLevel *= smooth
		midLevel *= smooth
		for (let i = 0; i < smoothBins.length; i++) smoothBins[i] *= smooth
		return getAudioState()
	}
	// @ts-expect-error buffer
	analyser.getByteFrequencyData(freqData)
	const sens = opts.sensitivity
	const bassN = Math.min(12, freqData.length)
	const midN = Math.min(40, freqData.length)
	let bass = 0
	let mid = 0
	let all = 0
	for (let i = 0; i < bassN; i++) bass += freqData[i]
	for (let i = bassN; i < midN; i++) mid += freqData[i]
	for (let i = 0; i < Math.min(64, freqData.length); i++) all += freqData[i]
	bass = Math.min(1, (bass / (bassN * 255)) * sens * (1 + opts.bass))
	mid = Math.min(1, (mid / (Math.max(1, midN - bassN) * 255)) * sens)
	all = Math.min(1, (all / (64 * 255)) * sens)
	const a = 1 - smooth
	bassLevel = bassLevel * smooth + bass * a
	midLevel = midLevel * smooth + mid * a
	audioLevel = audioLevel * smooth + all * a
	const step = Math.max(1, Math.floor(freqData.length / BIN_DRAW))
	if (smoothBins.length !== BIN_DRAW) smoothBins = new Array(BIN_DRAW).fill(0)
	for (let i = 0; i < BIN_DRAW; i++) {
		let s = 0
		const start = i * step
		for (let j = 0; j < step && start + j < freqData.length; j++) s += freqData[start + j]
		const v = Math.min(1, (s / (step * 255)) * sens * (i < 8 ? 1 + opts.bass * 0.35 : 1))
		smoothBins[i] = smoothBins[i] * smooth + v * a
	}
	return getAudioState()
}
