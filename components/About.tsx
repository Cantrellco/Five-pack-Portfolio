export function About() {
  return (
    <section id="about" className="section rule-top" aria-labelledby="about-title">
      <div className="shell">
        <div className="grid-editorial">
          <p className="label col-aside" data-reveal>
            About
          </p>

          <div className="col-main">
            <h2 id="about-title" className="display-2" data-reveal>
              Self-taught, and I maintain what I ship
            </h2>

            <div className="body-copy mt-[var(--sp-md)] text-md leading-[1.5]" data-reveal>
              <p>
                I learned Swift by building an app I wanted to use, then kept going until it was on the App
                Store. Since then I have handled its releases, its crash reports and its support email — which
                has taught me more about writing maintainable code than building it ever did.
              </p>
              <p>
                I want to bring that ownership onto a team: to work on software with real users and other
                engineers reading my diffs, where the review culture is the point rather than an obstacle.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
