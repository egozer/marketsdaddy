import Link from "next/link";

const BUILD_VERSION = process.env.NEXT_PUBLIC_BUILD_VERSION ?? "dev";

export const FluxaFooter = (): JSX.Element => (
  <footer className="fluxa-footer" aria-label="Global footer">
    <div className="fluxa-shell-row">
      <span>Data: fawazahmed0/exchange-api</span>
      <span>
        <Link href="https://github.com/fawazahmed0/exchange-api" target="_blank" rel="noreferrer">
          GitHub
        </Link>
      </span>
      <span>
        Build
        {" "}
        {BUILD_VERSION}
      </span>
    </div>
  </footer>
);
