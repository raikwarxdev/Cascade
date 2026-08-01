import Head from "next/head";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Cascade — Self-Correcting Multi-Agent Workflows</title>
        <meta
          name="description"
          content="A multi-agent system with self-correcting retries, a human approval checkpoint, and a live execution trace."
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
