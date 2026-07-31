import Image from 'next/image';
import { flagship } from '@/content/projects';
import { publicFileExists } from '@/lib/media';

type Shot = { src: string; alt: string; label: string };

/**
 * Little device chrome for a screenshot.
 *
 * Each frame is one flat ink-line SVG in public/media/frames/, generated to
 * the site's own six-token palette and cropped so the SVG's own bounds ARE
 * the device silhouette — no dead margin to account for. It sits as a CSS
 * background (never an `<img>`, so `next/lint`'s img-element rule never
 * applies and there is no `next/image` SVG restriction to work around),
 * `bg-contain` against a container whose `aspect-[]` matches the SVG's own
 * width/height exactly, so it always fills edge to edge with no cropping.
 *
 * The screenshot sits underneath in its own absolutely-inset box, sized to
 * the frame's screen cutout by eye against the generated art (see
 * `frame-test.html` in scratch — there is no build-time link between the two,
 * so a redrawn frame needs its inset re-measured by hand). The frame draws
 * only the bezel and the screen's own rounded edge — no separate notch or
 * home-indicator artwork — because a real device screenshot already has its
 * own status bar, island and home indicator baked in; drawing a second set
 * over the top just doubles them and they never quite land on each other.
 * The inset box gets a matching corner radius and `overflow-hidden` of its
 * own so a screenshot's native (slightly darker) corner pixels get cropped
 * away rather than peeking out next to the frame's ink line.
 */
function PhoneChrome({ src, alt, label, present, sizes }: Shot & { present: boolean; sizes: string }) {
  return (
    <div className="relative aspect-[1203/2417] overflow-hidden">
      <div className="absolute inset-[3.6%_6%] overflow-hidden rounded-[10%] bg-paper-2">
        {present ? (
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
        ) : (
          <span className="label flex h-full items-center justify-center px-[var(--sp-xs)] text-center">
            {label}
          </span>
        )}
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/media/frames/phone-frame.svg')] bg-contain bg-center bg-no-repeat"
      />
    </div>
  );
}

/**
 * Same contract as `PhoneChrome`, against `public/media/frames/monitor-frame.svg`.
 *
 * The monitor's own aspect box has to be tall enough to fit the stand below
 * the screen, so it is visibly wider than the screen-plus-stand silhouette —
 * the recessed-panel background belongs on the screen's own inset box, not
 * on the outer box, or it paints a flat rectangle in the empty space either
 * side of the stand.
 */
function MonitorChrome({ src, alt, label, present, sizes }: Shot & { present: boolean; sizes: string }) {
  return (
    <div className="relative aspect-[1242/1086] overflow-hidden">
      <div className="absolute inset-[5.25%_4.27%_33.33%_4.35%] overflow-hidden bg-paper-2">
        {present ? (
          <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
        ) : (
          <span className="label flex h-full items-center justify-center px-[var(--sp-xs)] text-center">
            {label}
          </span>
        )}
      </div>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[url('/media/frames/monitor-frame.svg')] bg-contain bg-center bg-no-repeat"
      />
    </div>
  );
}

/**
 * A row of phone-framed screenshots. Every frame reserves its aspect ratio
 * whether or not the image is there yet, so dropping the real PNGs into
 * public/media/ later adds pixels without moving a single element on the page.
 */
export function PhoneFrameGrid({ shots, sizes }: { shots: readonly Shot[]; sizes: string }) {
  return (
    <ul
      className="mt-[var(--sp-lg)] grid max-w-[46rem] grid-cols-2 gap-[var(--sp-sm)] md:grid-cols-4"
      data-reveal
    >
      {shots.map((shot) => {
        const present = publicFileExists(shot.src);
        return (
          <li key={shot.src}>
            <PhoneChrome {...shot} present={present} sizes={sizes} />
            {present ? <p className="label mt-[var(--sp-2xs)]">{shot.label}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A site's desktop and mobile views, side by side — the same "how does it
 * look on my phone" question every client asks first, answered without
 * leaving the case study. The phone sits at a fixed, noticeably narrower
 * width than the monitor; it's a second full device, not a second column,
 * so matching widths would read as two unrelated frames rather than one
 * pair. `mobile` is optional — a site with no mobile shot yet just renders
 * the monitor on its own, as before.
 *
 * The phone's width (11.25rem) is chosen so its height lands close to the
 * monitor's at the monitor's own max-width (26rem) — the two frames read as
 * a matched pair standing at roughly the same height, not a big one and a
 * small one, even though the phone is the narrower silhouette.
 *
 * The monitor carries a `min-w` so that below it `flex-1` would otherwise
 * shrink the monitor smaller than the fixed-width phone beside it — inverting
 * which one reads as primary. Once the row is too narrow for both at a
 * sensible size, `flex-wrap` drops the phone to its own line under the
 * monitor instead of squeezing either past that floor.
 */
export function SiteFrame({
  src,
  alt,
  label,
  sizes,
  mobile,
}: Shot & { sizes: string; mobile?: Shot }) {
  const present = publicFileExists(src);
  const mobilePresent = mobile ? publicFileExists(mobile.src) : false;

  return (
    <div className="mt-[var(--sp-lg)] flex flex-wrap items-end gap-[var(--sp-md)]" data-reveal>
      <div className="min-w-[14rem] max-w-[26rem] flex-1">
        <MonitorChrome src={src} alt={alt} label={label} present={present} sizes={sizes} />
        {present ? <p className="label mt-[var(--sp-2xs)]">{label}</p> : null}
      </div>
      {mobile ? (
        <div className="w-[11.25rem] shrink-0">
          <PhoneChrome {...mobile} present={mobilePresent} sizes="11.25rem" />
          {mobilePresent ? <p className="label mt-[var(--sp-2xs)]">{mobile.label}</p> : null}
        </div>
      ) : null}
    </div>
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
