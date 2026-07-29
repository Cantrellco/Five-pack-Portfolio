import { About } from '@/components/About';
import { ClientWork } from '@/components/ClientWork';
import { Contact } from '@/components/Contact';
import { FieldNote } from '@/components/FieldNote';
import { Flagship } from '@/components/Flagship';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { Masthead } from '@/components/Masthead';
import { SecondProject } from '@/components/SecondProject';
import { FieldMount } from '@/components/field/FieldMount';
import { MotionProvider } from '@/components/motion/MotionProvider';
import { getGithubSummary } from '@/lib/github';

/** Static page, refreshed daily so the GitHub figures stay current. */
export const revalidate = 86400;

export default async function Page() {
  const github = await getGithubSummary();

  return (
    <>
      <FieldMount />
      <div className="page">
        <Masthead />
        <main id="main" tabIndex={-1} className="outline-none">
          <Hero />
          <Flagship />
          <FieldNote />
          <SecondProject />
          <ClientWork />
          <About />
          <Contact github={github} />
        </main>
        <Footer />
      </div>
      <MotionProvider />
    </>
  );
}
