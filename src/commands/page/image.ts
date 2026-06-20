import { defineCommand } from '../define';
import { parseImageArgs, runImageAction } from '../shared/image-utils';
import { images } from './images';

export const image = defineCommand({
  name: 'image',
  description: 'List or open/copy/show page images by number.',
  usage: 'image | image <#> [open|copy|show] | image <action> <#>',
  examples: ['image', 'image 1', 'image 1 copy', 'image copy 2', 'image show 1'],
  category: 'utility',
  seeAlso: ['images', 'shot', 'clip'],
  notes: 'No args lists images. image <#> opens. image 1 copy works either order.',
  handler: async (args, ctx) => {
    const parsed = parseImageArgs(args);
    if (parsed.index === undefined) {
      return images.handler(args, ctx);
    }
    return runImageAction(parsed, ctx);
  },
});