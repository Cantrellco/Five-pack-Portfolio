import { test, expect, type ConsoleMessage, type Page } from '@playwright/test';

/** Six projects, always all six in the row. */
const WORK_TAB_COUNT = 6;

/**
 * Messages emitted by the headless GL stack rather than by the page. Software
 * rasterisation plus Playwright's screenshot path produces these; they do not
 * occur on real hardware and nothing in the site can prevent them.
 */
const ENVIRONMENT_NOISE = /GL Driver Message|\[\.WebGL-0x|Automatic fallback to software WebGL/i;

/** Anything else the browser complains about is a failure, not a warning. */
function watchConsole(page: Page) {
  const problems: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() !== 'error' && m.type() !== 'warning') return;
    if (ENVIRONMENT_NOISE.test(m.text())) return;
    problems.push(`${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return problems;
}

test('loads, names the person, and says nothing to the console', async ({ page }) => {
  const problems = watchConsole(page);

  await page.goto('/');
  await expect(page).toHaveTitle(/Cody Cantrell/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cody');
  await expect(page.getByRole('link', { name: /App Store/i }).first()).toBeVisible();

  // Give the deferred canvas time to load and start drawing.
  await page.waitForTimeout(3000);
  expect(problems).toEqual([]);
});

test.describe('in-page anchors', () => {
  // Checked with scripting off, which is where they all exist: enhanced, the
  // section nav and the project index are buttons, so the enhanced page has
  // only the skip link to sweep and the check is nearly vacuous. Unenhanced
  // every one of them is a real href that has to resolve — the same markup
  // that ships to a crawler.
  test.use({ javaScriptEnabled: false });

  test('every in-page anchor reaches a real section', async ({ page }) => {
    await page.goto('/');

    const hrefs = await page.locator('a[href^="#"]').evaluateAll((links) =>
      links.map((l) => l.getAttribute('href')!).filter((h) => h.length > 1),
    );
    expect(hrefs.length).toBeGreaterThan(4);

    for (const href of hrefs) {
      await expect(page.locator(href), `${href} has no target`).toHaveCount(1);
    }
  });
});

test('no horizontal overflow from 320px up', async ({ page }) => {
  await page.goto('/');

  const widths = [320, 390, 768, 1024, 1280, 1440, 1920];

  // The document AND the pane. From `lg` up the right pane owns the scrollbar,
  // so content can overflow sideways inside it while the document stays exactly
  // as wide as the window — which is how 5px of an architecture node hid from
  // a document-only check.
  const measure = async () =>
    page.evaluate(() => {
      const doc = document.documentElement;
      const pane = document.getElementById('deck-scroller');
      return Math.max(
        doc.scrollWidth - doc.clientWidth,
        pane ? pane.scrollWidth - pane.clientWidth : 0,
      );
    });

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    expect(await measure(), `overflows at ${width}px`).toBeLessThanOrEqual(0);
  }

  // Checking only the grid itself left other projects' dialog content
  // untested — a screenshot or an architecture diagram sized wrong could
  // widen the document under a project nothing opens by default. The grid's
  // own overflow has its own dedicated test below.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('tab', { name: 'Work' }).first().click();

  for (const project of ['Workout Buddy', 'Faith Outreach', 'Fusion Coffee']) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByRole('link', { name: project }).click();

    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);
      expect(await measure(), `${project} overflows at ${width}px`).toBeLessThanOrEqual(0);
    }

    // The grid behind it is inert while the dialog is open — closing it is
    // what makes the next project's tile clickable again.
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.keyboard.press('Escape');
  }
});

test('the skip link is reachable by keyboard and moves focus to the content', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skip = page.getByRole('link', { name: /skip to content/i });
  await expect(skip).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test.describe('the deck', () => {
  test('shows one panel at a time and puts the choice in the URL', async ({ page }) => {
    const problems = watchConsole(page);
    await page.goto('/');

    await expect(page.locator('[data-panel]:not([hidden])')).toHaveCount(1);
    await expect(page.locator('#about')).toBeVisible();

    await page.getByRole('tab', { name: 'Resume' }).first().click();
    await expect(page.locator('#resume')).toBeVisible();
    await expect(page.locator('#about')).toBeHidden();
    expect(page.url()).toContain('#resume');

    // The panel change went through history, so Back is a real Back.
    await page.goBack();
    await expect(page.locator('#about')).toBeVisible();

    await page.waitForTimeout(1500);
    expect(problems).toEqual([]);
  });

  test('a deep link opens the panel it names', async ({ page }) => {
    await page.goto('/#contact');
    await expect(page.locator('#contact')).toBeVisible();
    await expect(page.locator('#about')).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Contact' }).first()).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('the tablist is driveable from the keyboard', async ({ page }) => {
    await page.goto('/');

    // Scoped to the section tablist by name. There are now two tablists on the
    // page — sections and projects — so an unqualified `getByRole('tab')`
    // would be asserting against whichever happened to come first in the DOM.
    const tabs = page.getByRole('tablist', { name: 'Sections' }).first().getByRole('tab');
    await tabs.first().focus();
    await page.keyboard.press('ArrowRight');

    await expect(page.locator('#resume')).toBeVisible();
    // Selection follows focus, so the focused tab is never the wrong one.
    await expect(page.getByRole('tab', { name: 'Resume' }).first()).toBeFocused();

    await page.keyboard.press('End');
    await expect(page.locator('#contact')).toBeVisible();
  });
});

test.describe('the project grid inside Work', () => {
  test('opens to a grid with nothing chosen, and puts an open project in the URL', async ({
    page,
  }) => {
    const problems = watchConsole(page);
    await page.goto('/');
    await page.getByRole('tab', { name: 'Work' }).first().click();

    // Every project is one click away; none is already open.
    await expect(page.locator('dialog[data-work-project][open]')).toHaveCount(0);

    await page.getByRole('link', { name: 'The Harvest' }).click();
    await expect(page.locator('#the-harvest')).toBeVisible();
    expect(page.url()).toContain('#the-harvest');

    // A project's dialog holds only that project: nothing from a sibling leaks in.
    await expect(page.getByRole('heading', { name: 'Workout Buddy' })).toBeHidden();
    await expect(page.getByRole('heading', { name: 'PC Pro Inspections' })).toBeHidden();

    // Back closes the dialog and returns to the grid, the same as any other
    // navigation this history entry undoes.
    await page.goBack();
    await expect(page.locator('#the-harvest')).toBeHidden();
    await expect(page.locator('dialog[data-work-project][open]')).toHaveCount(0);

    await page.waitForTimeout(1500);
    expect(problems).toEqual([]);
  });

  test('a deep link opens Work AND that project as a dialog', async ({ page }) => {
    // The hash holds one value and the grid owns it, so this only works if
    // the outer deck resolves a project id back to the panel that holds it.
    await page.goto('/#pc-pro');

    await expect(page.locator('#work')).toBeVisible();
    await expect(page.locator('#about')).toBeHidden();
    await expect(page.getByRole('tab', { name: 'Work' }).first()).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Visible at all implies open — a closed `<dialog>` is `display: none`.
    await expect(page.locator('#pc-pro')).toBeVisible();
    await expect(page.locator('#workout-buddy')).toBeHidden();
  });

  test('a hash naming an Object.prototype member is not a panel', async ({ page }) => {
    // The child->parent lookup used to be a plain object, so `#toString` found
    // an inherited function, passed the truthiness check, and became the active
    // panel — no panel id matched it, so every panel took `hidden` and the page
    // rendered an empty column. Reached at runtime, React then called that
    // function as a state updater and tore the whole tree down.
    const problems = watchConsole(page);

    for (const key of ['toString', 'valueOf', 'hasOwnProperty', 'constructor', '__proto__']) {
      // The query string is what makes each of these a real navigation. Going
      // from `/#work` to `/#valueOf` changes only the fragment, so the browser
      // fires hashchange instead of loading the document — which would test the
      // runtime path twice and the load path never.
      await page.goto(`/?probe=${key}#${key}`);

      // Unrecognised hash means "not about the deck", so the default panel opens.
      await expect(page.locator('[data-panel]:not([hidden])')).toHaveCount(1);
      await expect(page.locator('#about')).toBeVisible();

      // And the same key arriving as a hashchange on a live page is survivable.
      await page.evaluate((k) => {
        window.location.hash = `#${k}`;
      }, key);
      await page.evaluate(() => {
        window.location.hash = '#work';
      });
      await expect(page.locator('#work')).toBeVisible();
      expect(problems, `#${key} broke the page`).toEqual([]);
    }
  });

  test('the URL always names the open project, or #work when none is open', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Work' }).first().click();
    await page.getByRole('link', { name: 'The Harvest' }).click();
    await expect(page).toHaveURL(/#the-harvest$/);

    // The address is shareable while it's open: reloading it lands on the
    // same project.
    await page.reload();
    await expect(page.locator('#the-harvest')).toBeVisible();

    // Closing is what makes the rest of the page reachable again —
    // `showModal()` leaves everything outside the dialog inert, the outer
    // section nav included, so there is no UI path to the About tab before
    // this. The outer deck writes `#work` with pushState, which fires no
    // hashchange, so this provider never hears about it and would go on
    // holding whichever project was last open if closing didn't already
    // correct the hash itself.
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/#work$/);

    await page.getByRole('tab', { name: 'About' }).first().click();
    await page.getByRole('tab', { name: 'Work' }).first().click();

    // Back to a grid with nothing open — not a stale project the outer deck
    // never actually asked to close.
    await expect(page).toHaveURL(/#work$/);
    await expect(page.locator('dialog[data-work-project][open]')).toHaveCount(0);
  });

  test('every project is visible and can be opened, one dialog at a time', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Work' }).first().click();

    // The drum this replaced turned three of the six away from the reader and
    // gave them `pointer-events: none`, so half the grid could not be clicked
    // and the two either side of the front were squeezed to a third of their
    // width. The grid has no such state: six real tiles, all square to the
    // screen, all reachable in one click.
    const tiles = page.locator('.work-tile');
    await expect(tiles).toHaveCount(WORK_TAB_COUNT);

    for (let i = 0; i < WORK_TAB_COUNT; i += 1) {
      const tile = tiles.nth(i);
      await expect(tile).toBeVisible();
      const href = await tile.getAttribute('href');
      await tile.click();
      await expect(page.locator(href!)).toBeVisible();

      // `showModal()` makes the rest of the page inert, tile included — the
      // next one in the loop is not reachable until this dialog closes.
      await page.keyboard.press('Escape');
      await expect(page.locator(href!)).toBeHidden();
    }
  });

  test('the grid never scrolls or hides a project, at any width', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Work' }).first().click();

    // Six tiles of uneven summary length are exactly the shape that could
    // overflow sideways on a phone — the grid reflows to fewer columns
    // instead. It must never scroll, and no tile may go missing.
    for (const width of [1920, 1440, 1280, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(150);

      const grid = await page.evaluate(() => {
        const el = document.querySelector('.work-grid')!;
        return {
          hidden: el.scrollWidth - el.clientWidth,
          count: el.querySelectorAll('.work-tile').length,
        };
      });

      expect(grid.hidden, `the grid scrolls at ${width}px`).toBeLessThanOrEqual(0);
      expect(grid.count, `a tile went missing at ${width}px`).toBe(WORK_TAB_COUNT);
    }
  });

  test('a project dialog is fully operable from the keyboard', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: 'Work' }).first().click();

    const tile = page.getByRole('link', { name: 'Workout Buddy' });
    await tile.focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#workout-buddy')).toBeVisible();
    // The close button is the dialog's first focusable descendant, and is
    // marked autofocus besides — `showModal()` moving focus into the dialog
    // is what makes Tab trapped inside it rather than escaping to the page
    // behind it, which is the whole point of a MODAL dialog.
    await expect(page.locator('#workout-buddy .work-dialog-close')).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(page.locator('#workout-buddy')).toBeHidden();
    // `close()` returns focus to whatever opened the dialog, by itself — this
    // is native `<dialog>` behaviour, not anything the site's own code does.
    await expect(tile).toBeFocused();
  });

  test.describe('the project dialog', () => {
    test('closes via its own button, updating the URL and returning focus to the tile', async ({
      page,
    }) => {
      await page.goto('/');
      await page.getByRole('tab', { name: 'Work' }).first().click();

      const tile = page.getByRole('link', { name: 'The Harvest' });
      await tile.click();

      const dialog = page.locator('#the-harvest');
      await expect(dialog).toBeVisible();
      expect(page.url()).toContain('#the-harvest');

      await page.locator('#the-harvest .work-dialog-close').click();
      await expect(dialog).toBeHidden();
      await expect(tile).toBeFocused();
      await expect(page).toHaveURL(/#work$/);
    });

    test('a click on the backdrop closes it', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('tab', { name: 'Work' }).first().click();
      await page.getByRole('link', { name: 'Little Town' }).click();
      await expect(page.locator('#little-town')).toBeVisible();

      // Outside the centred dialog's own box, not on any real control.
      await page.mouse.click(10, 10);

      await expect(page.locator('#little-town')).toBeHidden();
    });

    test('only one dialog is ever open at a time, even switching by hash', async ({ page }) => {
      await page.goto('/#workout-buddy');
      await expect(page.locator('#workout-buddy')).toBeVisible();

      // The same path Back/Forward take: a hash change with no reload.
      await page.evaluate(() => {
        window.location.hash = '#the-harvest';
      });

      await expect(page.locator('#the-harvest')).toBeVisible();
      await expect(page.locator('#workout-buddy')).toBeHidden();
      await expect(page.locator('dialog[data-work-project][open]')).toHaveCount(1);
    });

    // The dialog's entrance and exit are CSS alone — `@starting-style` plus
    // `allow-discrete` — new platform surface this site has not used before.
    // A silent throw from it would not fail any assertion above; it would
    // only show up here.
    test('opening and closing several projects in a row throws nothing to the console', async ({
      page,
    }) => {
      const problems = watchConsole(page);
      await page.goto('/');
      await page.getByRole('tab', { name: 'Work' }).first().click();

      for (const name of ['The Harvest', 'Little Town', 'Fusion Coffee', 'PC Pro Inspections']) {
        await page.getByRole('link', { name }).click();
        await page.waitForTimeout(200);
        await page.keyboard.press('Escape');
        await page.waitForTimeout(600);
      }

      expect(problems).toEqual([]);
    });

    test('with reduced motion, opening is instant and settles with nothing hidden', async ({
      page,
    }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const problems = watchConsole(page);
      await page.goto('/');
      await page.getByRole('tab', { name: 'Work' }).first().click();

      await page.getByRole('link', { name: 'Little Town' }).click();
      // Reduced motion skips the CSS entrance transition outright, so there
      // is no animation to wait out — the very next frame is final.
      await page.waitForTimeout(50);

      await expect(page.locator('#little-town')).toBeVisible();

      const hidden = await page
        .locator('#little-town [data-reveal]')
        .evaluateAll((els) => els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9).length);
      expect(hidden).toBe(0);
      expect(problems).toEqual([]);
    });
  });
});

test.describe('with JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  test('the page is complete and readable', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cantrell');

    // Every panel in the deck, stacked and readable. Without scripting there
    // is no tablist and nothing is hidden, so the count is the total across
    // all four panels — that is the assertion that the deck degrades to a
    // plain document rather than to three quarters of one.
    // 10 since the Work panel took a headline of its own ("What I have built"
    // in components/work/WorkGrid.tsx); it was 9 while that panel opened
    // straight into the tile grid.
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(10);
    await expect(page.locator('[data-panel]:not([hidden])')).toHaveCount(4);
    await expect(page.getByRole('tab')).toHaveCount(0);

    // The project grid degrades the same way: every project's dialog is
    // simply `open` — a plain block of content on the page — rather than a
    // dialog at all, and the grid itself is a list of anchors into them.
    await expect(page.locator('dialog[data-work-project][open]')).toHaveCount(6);
    for (const id of [
      'workout-buddy',
      'the-harvest',
      'little-town',
      'fusion-coffee',
      'pc-pro',
      'faith-outreach',
    ]) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }

    await expect(page.getByRole('link', { name: /Open in the App Store/i })).toBeVisible();

    // The reveal gate must never leave content hidden without scripting.
    const hidden = await page.locator('[data-reveal]').evaluateAll(
      (els) => els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9).length,
    );
    expect(hidden).toBe(0);

    // The static frame stands in for the canvas.
    await expect(page.locator('.field-poster')).toHaveCSS('opacity', '1');
  });
});

test.describe('the phone layout', () => {
  // Below `lg` the page is a different machine: the masthead tablist is
  // display: none, the identity column is screen-reader-only, and the menu
  // dropdown is the only navigation. None of the desktop-viewport tests
  // exercise any of that, so it gets its own block at a real phone size.
  test.use({ viewport: { width: 390, height: 844 } });

  test('the menu opens, switches panels, closes, and returns focus to its button', async ({
    page,
  }) => {
    const problems = watchConsole(page);
    await page.goto('/');

    const button = page.locator('.mobile-menu-button');
    await expect(button).toBeVisible();
    await button.click();

    const list = page.locator('.mobile-menu-list');
    await expect(list).toBeVisible();
    await list.getByRole('button', { name: 'Contact' }).click();

    await expect(page.locator('#contact')).toBeVisible();
    await expect(page.locator('#about')).toBeHidden();
    // The menu closes behind the choice and hands focus back to its button,
    // the way a disclosure is supposed to — not to <body>.
    await expect(list).toBeHidden();
    await expect(button).toBeFocused();

    // Escape from an open menu does the same.
    await button.click();
    await page.keyboard.press('Escape');
    await expect(list).toBeHidden();
    await expect(button).toBeFocused();

    expect(problems).toEqual([]);
  });

  test('the level-1 heading stays in the tree, and no orphan tabpanel is exposed', async ({
    page,
  }) => {
    await page.goto('/');

    // The header strip is gone; the name survives as a screen-reader-only
    // heading. `toContainText` reads the tree, not the paint.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Cantrell');

    // No tablist exists at this width, so no panel may claim to be a
    // tabpanel — a tabpanel with no owning tab anywhere in the tree is a
    // structure screen readers announce but cannot navigate.
    await expect(page.getByRole('tab')).toHaveCount(0);
    await expect(page.locator('[role="tabpanel"]')).toHaveCount(0);
  });

  test.describe('with JavaScript disabled', () => {
    test.use({ javaScriptEnabled: false });

    test('the menu toggles natively and its anchors land on the section they name', async ({
      page,
    }) => {
      await page.goto('/');

      // Native <details>: the summary toggles with no scripting at all.
      await page.locator('.mobile-menu-button').click();
      const contact = page.locator('.mobile-menu-list a[href="#contact"]');
      await expect(contact).toBeVisible();
      await contact.click();

      // The jump lands at the section, not ~100px short of it — the desktop
      // masthead's scroll-margin must not apply where no masthead exists.
      // Polled because `scroll-behavior: smooth` animates the jump.
      await expect(page).toHaveURL(/#contact$/);
      await expect
        .poll(() =>
          page.evaluate(() =>
            Math.abs(document.getElementById('contact')!.getBoundingClientRect().top),
          ),
        )
        .toBeLessThanOrEqual(80);
    });
  });
});

test.describe('with WebGL unavailable', () => {
  test('falls back to the static frame and stays quiet', async ({ page }) => {
    const problems = watchConsole(page);
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...rest: unknown[]) {
        if (String(type).includes('webgl')) return null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (real as any).call(this, type, ...rest);
      } as typeof HTMLCanvasElement.prototype.getContext;
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    await expect(page.locator('.field-layer canvas')).toHaveCount(0);
    await expect(page.locator('.field-poster')).toHaveCSS('opacity', '1');
    expect(problems).toEqual([]);
  });
});

test.describe('with reduced motion', () => {
  test('shows everything at once and never starts the canvas', async ({ page }) => {
    // emulateMedia rather than the `reducedMotion` context option: the option
    // does not reliably reach matchMedia here, and a preference test that
    // silently tests the default preference is worse than no test.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(
      await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches),
    ).toBe(true);

    await page.goto('/');
    await page.waitForTimeout(2000);

    const hidden = await page.locator('[data-reveal]').evaluateAll(
      (els) => els.filter((e) => parseFloat(getComputedStyle(e).opacity) < 0.9).length,
    );
    expect(hidden).toBe(0);
    await expect(page.locator('.field-layer canvas')).toHaveCount(0);
  });
});

test.describe('the 404 page', () => {
  test('answers a wrong address with a real 404 and the way back', async ({ page }) => {
    const response = await page.goto('/definitely-not-a-page');
    expect(response?.status()).toBe(404);

    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Nothing lives at this address.',
    );
    await expect(page.getByRole('link', { name: 'Back to the front page' })).toBeVisible();
  });
});

test.describe('in print', () => {
  test('the chrome disappears and the resume panel prints', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });

    // The field never prints; neither does the masthead or the panels that
    // are not the letter — the print stylesheet is a resume, not a screenshot.
    await expect(page.locator('.field-layer')).toBeHidden();
    await expect(page.locator('header').first()).toBeHidden();
    await expect(page.locator('#about')).toBeHidden();
    await expect(page.locator('#work')).toBeHidden();

    // The resume panel un-hides for print even though the deck left it
    // `hidden` — that is the layered restore rule doing its one job.
    await expect(page.locator('#resume')).toBeVisible();
    await expect(page.locator('#contact')).toBeVisible();
  });
});
