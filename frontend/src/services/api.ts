export const sendText = async (text: string) => {
    const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
    });
    return res.json();
};

export const streamAudio = async (
    audioBlob: Blob,
    duration: number,
    onChunk: (data: any) => void,
    onComplete: () => void,
    onError: (err: any) => void
) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('input_duration', duration.toString());

    try {
        const response = await fetch('/chat/audio/stream', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error("Upload failed");

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No readable stream");

        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            buffer += chunk;

            const lines = buffer.split('\n\n');
            // Check if buffer ended with \n\n. If not, last part is incomplete.
            // But split removes the separator. We need to be careful with partial messages.
            // A safer way is to keep the last segment if it's not empty? 
            // Actually standard SSE implies double newline.

            // If the buffer doesn't end with \n\n, the last line in `lines` is partial (or empty string if it did end).
            // Let's handle it simply:
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.trim().startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.trim().slice(6));
                        onChunk(data);
                    } catch (e) {
                        console.error("Parse error", e);
                    }
                }
            }
        }
        onComplete();
    } catch (e) {
        onError(e);
    }
};
