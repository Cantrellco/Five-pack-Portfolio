import { clientWork } from '@/content/projects';

export function ClientWork() {
  return (
    <section id="clients" className="section rule-top" aria-labelledby="clients-title">
      <div className="shell">
        <div className="grid-editorial">
          <p className="label col-aside" data-reveal>
            Client work
          </p>

          <div className="col-wide">
            <h2 id="clients-title" className="display-2" data-reveal>
              Built to someone else&rsquo;s requirements
            </h2>

            <ul className="mt-[var(--sp-md)] border-t border-rule">
              {clientWork.map((item) => (
                <li
                  key={item.name}
                  className="grid grid-cols-1 gap-[var(--sp-2xs)] border-b border-rule py-[var(--sp-md)] md:grid-cols-[minmax(0,14rem)_1fr] md:gap-[var(--sp-md)]"
                  data-reveal
                >
                  <h3 className="display-3">
                    {item.url ? (
                      <a className="link-block" href={item.url} rel="noopener">
                        {item.name}
                      </a>
                    ) : (
                      item.name
                    )}
                  </h3>
                  <div className="text-graphite">
                    {item.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
