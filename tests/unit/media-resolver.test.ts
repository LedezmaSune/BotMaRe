import { describe, it, expect } from 'vitest';
import { MediaResolverService } from '../../src/modules/scheduling/services/media-resolver.service';

describe('MediaResolverService', () => {
    it('infers media type from extensions correctly', () => {
        expect(MediaResolverService.inferMediaType('photo.jpg')).toBe('image');
        expect(MediaResolverService.inferMediaType('photo.PNG')).toBe('image');
        expect(MediaResolverService.inferMediaType('video.mp4')).toBe('video');
        expect(MediaResolverService.inferMediaType('audio.mp3')).toBe('audio');
        expect(MediaResolverService.inferMediaType('document.pdf')).toBe('document');
        expect(MediaResolverService.inferMediaType('archive.zip')).toBe('document');
    });

    it('returns exists: false for undefined mediaPath', async () => {
        const res = await MediaResolverService.resolveMediaPath(undefined);
        expect(res.exists).toBe(false);
    });
});
