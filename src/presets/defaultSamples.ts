/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Built-in default sample catalog for BeatBuddy Studio.
 * Ensures percussion samples are never lost when deployed on Vercel or any static host.
 */

export interface BuiltInSampleDef {
  id: string;
  name: string;
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
  category: 'brazilian' | 'latin' | 'kick' | 'snare' | 'percussion';
}

export const BUILT_IN_SAMPLES: BuiltInSampleDef[] = [
  {
    id: 'sample_1791928977387_ssxqu',
    name: 'pandeiro grave.wav',
    fileName: 'sample_1791928977387_ssxqu.wav',
    url: '/samples/sample_1791928977387_ssxqu.wav',
    mimeType: 'audio/wav',
    size: 348160,
    category: 'brazilian',
  },
  {
    id: 'sample_1791928977720_5b722',
    name: 'pandeiro tapa.wav',
    fileName: 'sample_1791928977720_5b722.wav',
    url: '/samples/sample_1791928977720_5b722.wav',
    mimeType: 'audio/wav',
    size: 345676,
    category: 'brazilian',
  },
  {
    id: 'sample_1791929097159_2w8rm',
    name: 'ganza.wav',
    fileName: 'sample_1791929097159_2w8rm.wav',
    url: '/samples/sample_1791929097159_2w8rm.wav',
    mimeType: 'audio/wav',
    size: 344950,
    category: 'brazilian',
  },
  {
    id: 'sample_1791929185450_q4cv7',
    name: 'tamborim grave.wav',
    fileName: 'sample_1791929185450_q4cv7.wav',
    url: '/samples/sample_1791929185450_q4cv7.wav',
    mimeType: 'audio/wav',
    size: 318076,
    category: 'brazilian',
  },
  {
    id: 'sample_1791929249766_4ddn2',
    name: 'ovinho agudo.wav',
    fileName: 'sample_1791929249766_4ddn2.wav',
    url: '/samples/sample_1791929249766_4ddn2.wav',
    mimeType: 'audio/wav',
    size: 344950,
    category: 'percussion',
  },
  {
    id: 'sample_1791929293573_w07zv',
    name: 'kickdrum9.wav',
    fileName: 'sample_1791929293573_w07zv.wav',
    url: '/samples/sample_1791929293573_w07zv.wav',
    mimeType: 'audio/wav',
    size: 32966,
    category: 'kick',
  },
  {
    id: 'sample_1791929472468_l6qxe',
    name: 'GRAVE SD.wav',
    fileName: 'sample_1791929472468_l6qxe.wav',
    url: '/samples/sample_1791929472468_l6qxe.wav',
    mimeType: 'audio/wav',
    size: 289156,
    category: 'brazilian',
  },
  {
    id: 'sample_1791929483367_ii2ay',
    name: 'GRAVE 2 SD.wav',
    fileName: 'sample_1791929483367_ii2ay.wav',
    url: '/samples/sample_1791929483367_ii2ay.wav',
    mimeType: 'audio/wav',
    size: 145156,
    category: 'brazilian',
  },
];
