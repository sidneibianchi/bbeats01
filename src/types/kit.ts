/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * Type definitions for Drum Kits / Sound Kits in BeatBuddy Studio.
 */

import { TrackDefinition } from './rhythm';

export interface DrumKitDefinition {
  id: string;
  name: string;
  description: string;
  category: 'brazilian' | 'acoustic' | 'latin' | 'custom';
  isUserCreated: boolean;
  createdAt: number;
  tracks: TrackDefinition[];
}
