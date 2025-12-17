
import React from 'react';
import { Region } from './types';

export const REGIONS: { value: Region; label: string }[] = [
  { value: 'NA1', label: 'North America' },
  { value: 'EUW1', label: 'Europe West' },
  { value: 'EUNE1', label: 'Europe Nordic & East' },
  { value: 'KR', label: 'Korea' },
  { value: 'BR1', label: 'Brazil' },
  { value: 'LA1', label: 'LAN' },
  { value: 'LA2', label: 'LAS' },
  { value: 'OC1', label: 'Oceania' },
  { value: 'JP1', label: 'Japan' },
  { value: 'TR1', label: 'Turkey' },
  { value: 'RU', label: 'Russia' },
];

export const CHAMPION_MAP: Record<number, string> = {
  1: 'Annie', 2: 'Olaf', 3: 'Galio', 4: 'Twisted Fate', 5: 'Xin Zhao',
  21: 'Miss Fortune', 64: 'Lee Sin', 81: 'Ezreal', 157: 'Yasuo',
  202: 'Jhin', 222: 'Jinx', 236: 'Lucian', 412: 'Thresh',
  // Simplified for demo, in production this would fetch from Data Dragon
};

export const getChampIcon = (id: number) => `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`;
