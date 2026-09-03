import { sameTag, SheriffConfig } from '@softarc/sheriff-core';

export const config: SheriffConfig = {
  entryFile: './src/main.ts',
  enableBarrelLess: true,
  modules: {
    'src/app': ['type:shell'],
    'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>'],
  },

  depRules: {
    root: ['type:shell'],

    'type:shell': [
      'type:feature',
      'type:data',
      'type:ui',
      'type:util',
      'type:model',
    ],
    'type:feature': ['type:ui', 'type:data', 'type:util', 'type:model'],
    'type:ui': [sameTag, 'type:util', 'type:model'],
    'type:data': [sameTag, 'type:scene', 'type:util', 'type:model'],
    'type:scene': ['type:util', 'type:model'],
    'type:util': [sameTag, 'type:model'],
    'type:model': [sameTag],

    'domain:game': [sameTag, 'domain:@shared'],
    'domain:stage': [sameTag, 'domain:game', 'domain:@shared'],
    'domain:console': [sameTag, 'domain:game', 'domain:@shared'],
    'domain:audio': [sameTag, 'domain:game', 'domain:@shared'],
    'domain:@shared': [sameTag],
  },
};
