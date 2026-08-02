import { About } from '@/components/About';
import { ClientSite } from '@/components/ClientSite';
import { CommandPalette } from '@/components/CommandPalette';
import { Contact } from '@/components/Contact';
import { Flagship } from '@/components/Flagship';
import { Harvest } from '@/components/Harvest';
import { Identity } from '@/components/Identity';
import { Masthead } from '@/components/Masthead';
import { MobileMenu } from '@/components/MobileMenu';
import { Resume } from '@/components/Resume';
import { DeckProvider } from '@/components/deck/DeckContext';
import { Panel } from '@/components/deck/Panel';
import { FieldMorphTrigger } from '@/components/field/FieldMorphTrigger';
import { FieldMount } from '@/components/field/FieldMount';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { Skills } from '@/components/work/Skills';
import { WorkDeckProvider } from '@/components/work/WorkDeckContext';
import { WorkGrid } from '@/components/work/WorkGrid';
import { WorkProject } from '@/components/work/WorkPanel';
import { sites } from '@/content/projects';
import { getGithubSummary } from '@/lib/github';

/** Static page, refreshed daily so the GitHub figures stay current. */
export const revalidate = 86400;

/**
 * Two columns: who this is, and what they have done.
 *
 * The left column is the constant — name, role, portrait, the two links worth
 * following. It is sticky on a wide screen, so it stays put while the right
 * column changes, which is the whole idea borrowed from the reference site.
 *
 * The right column is a deck of documents. With scripting on, one shows at a
 * time and the masthead is a tablist. With scripting off, all four are on the
 * page in order and the masthead is a list of anchors — the site is then
 * exactly the scrolling document it was before the deck existed, which is why
 * turning JavaScript off costs nothing here.
 */
export default async function Page() {
  const github = await getGithubSummary();

  return (
    <>
      <FieldMount />
      <FieldMorphTrigger />
      <DeckProvider>
        <div className="page">
          <Masthead />
          {/* The phone's only piece of persistent chrome: a small trigger in
              the top-right corner that opens a full-screen section index.
              Fixed to the viewport, so it lives here at the page level
              rather than inside any column it would scroll with. */}
          <MobileMenu />

          {/* Desktop-only in practice — a phone has no Cmd/Ctrl+K to press —
              but not gated on viewport: an external keyboard on a tablet-width
              window should still reach it, and the dialog itself costs
              nothing while closed. */}
          <CommandPalette />

          <main id="main" tabIndex={-1} className="deck outline-none">
            <div className="deck-identity">
              <Identity />
            </div>

            {/* The right pane owns its own scrollbar from `lg` up, so the
                motion layer drives Lenis and ScrollTrigger from this element
                rather than from the window. It needs a stable id to be found. */}
            <div className="deck-content" id="deck-scroller">
                <Panel id="about">
                  <About />
                </Panel>

                <Panel id="resume">
                  <Resume />
                </Panel>

                {/* All six projects live on the page as a grid; each opens
                    its own case study in a dialog above it. */}
                <Panel id="work">
                  <WorkDeckProvider>
                    <WorkGrid />
                    <Skills />

                    <WorkProject id="workout-buddy">
                      <Flagship />
                    </WorkProject>

                    <WorkProject id="the-harvest">
                      <Harvest />
                    </WorkProject>

                    {sites.map((site) => (
                      <WorkProject key={site.id} id={site.id}>
                        <ClientSite site={site} />
                      </WorkProject>
                    ))}
                  </WorkDeckProvider>
                </Panel>

              <Panel id="contact">
                <Contact github={github} />
              </Panel>
            </div>
          </main>
        </div>
      </DeckProvider>
      <MotionProvider />
    </>
  );
}
