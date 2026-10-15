export type SampleUploadResult = {
  success: true;
  sample: {
    id: string;
    title: string | null;
    filename: string;
    fileUrl: string;
    fileKey: string;
    mimeType: string | null;
    duration: number | null;
    createdAt: string;
    updatedAt: string;
  };
};

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Could not read the sample file'));
        return;
      }

      const separator = reader.result.indexOf(',');
      if (separator === -1) {
        reject(new Error('Could not encode the sample file'));
        return;
      }
      resolve(reader.result.slice(separator + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read the sample file'));
    reader.readAsDataURL(file);
  });
}

export async function uploadSampleToUploadThing(
  file: File,
  localSampleId: string,
  title?: string
): Promise<SampleUploadResult> {
  if (file.size === 0 || file.size > 32 * 1024 * 1024) {
    throw new Error('Sample must be between 1 byte and 32 MiB');
  }
  if (file.type && !file.type.startsWith('audio/')) {
    throw new Error('Only audio files can be uploaded as samples');
  }

  const response = await fetch('/api/samples/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title || file.name,
      filename: file.name,
      localSampleId,
      mimeType: file.type || 'audio/mpeg',
      duration: 0,
      base64Data: await readFileAsBase64(file),
    }),
  });

  const result = (await response.json()) as
    | SampleUploadResult
    | { success: false; error?: string };

  if (!response.ok || !result.success) {
    throw new Error(
      'error' in result && result.error ? result.error : 'Failed to upload sample'
    );
  }

  return result;
}

export async function deleteSampleFromUploadThing(
  localSampleId: string,
  filename?: string
): Promise<void> {
  const response = await fetch(
    `/api/samples/db/${encodeURIComponent(localSampleId)}`,
    {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename }),
    }
  );

  const result = (await response.json()) as { success: boolean; error?: string };
  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Failed to delete cloud sample');
  }
}
