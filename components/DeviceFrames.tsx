import Image from 'next/image';
import { flagship } from '@/content/projects';
import { publicFileExists } from '@/lib/media';

/**
 * Screenshot row. Every frame reserves its aspect ratio whether or not the
 * image is there yet, so dropping the real PNGs into public/media/ later adds
 * pixels without moving a single element on the page.
 */
export function DeviceFrames() {
  const shots = flagship.media.screenshots;

  return (
    // Capped width: until the real screenshots land these are empty frames, and
    // four full-column voids would dominate the section they belong to.
    <ul
      className="mt-[var(--sp-lg)] grid max-w-[46rem] grid-cols-2 gap-[var(--sp-sm)] md:grid-cols-4"
      data-reveal
    >
      {shots.map((shot) => {
        const present = publicFileExists(shot.src);
        return (
          <li key={shot.src}>
            <div className="relative aspect-[9/19.5] overflow-hidden border border-rule bg-paper-2">
              {present ? (
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  fill
                  sizes="(min-width: 768px) 22vw, 44vw"
                  className="object-cover"
                />
              ) : (
                <span className="label absolute inset-x-0 bottom-[var(--sp-sm)] text-center">
                  {shot.label}
                </span>
              )}
            </div>
            {present ? <p className="label mt-[var(--sp-2xs)]">{shot.label}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

export function DemoClip() {
  const { demo } = flagship.media;
  if (!publicFileExists(demo.src)) return null;

  const poster = publicFileExists(demo.poster) ? demo.poster : undefined;

  return (
    <figure className="mt-[var(--sp-lg)]" data-reveal>
      {/* preload="none" — nothing of this downloads until someone presses play. */}
      <video
        className="w-full border border-rule bg-paper-2"
        controls
        muted
        playsInline
        preload="none"
        poster={poster}
        width={1280}
        height={720}
      >
        <source src={demo.src} type="video/mp4" />
      </video>
      <figcaption className="mono mt-[var(--sp-xs)] text-graphite">{demo.caption}</figcaption>
    </figure>
  );
}
