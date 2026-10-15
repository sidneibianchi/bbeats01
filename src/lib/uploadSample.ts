import {
  deleteSampleFromUploadThing,
  uploadSampleToUploadThing,
} from './uploadThing';

export function saveSampleToDatabase(file: File, localSampleId: string, title?: string) {
  return uploadSampleToUploadThing(file, localSampleId, title);
}

export function deleteSampleFromDatabase(localSampleId: string, filename?: string) {
  return deleteSampleFromUploadThing(localSampleId, filename);
}
