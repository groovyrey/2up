export default function Home() {
  return (
    <main className="page main">
      <header className="header">
        <p>My App</p>
        <a
          href="https://github.com/username/my-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Code
        </a>
      </header>
      <div className="intro">
        <h1>My App</h1>
        <p>Welcome to my new web app.</p>
        <div className="ctas">
          <a
            className="primary"
            href="https://github.com/username/my-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Star on GitHub
          </a>
          <a
            className="secondary"
            href="https://github.com/username/my-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Deploy
          </a>
        </div>
      </div>
    </main>
  );
}