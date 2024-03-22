import { defineApp } from "$fresh/server.ts";

export default defineApp((_request, { Component }) => {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <link rel="stylesheet" href="/pico.fuchsia.min.css" />
        <title>SendMe</title>
      </head>
      <body>
        <header>
          <nav className="container">
            <ul>
              <li>
                <hgroup>
                  <h1>SendMe</h1>
                  <p>Send me the files!</p>
                </hgroup>
              </li>
            </ul>
            <ul>
              <li>
                <a href="/">Home</a>
              </li>
              <li>|</li>
              <li>
                <a href="/about">About</a>
              </li>
            </ul>
          </nav>
          <hr />
        </header>
        <main className="container">
          <Component />
        </main>
        <footer className="container">
          <hr />
          <div className="container"></div>
          <small>
            Created by <a href="https://github.com/mblonyox">mblonyox</a>.
          </small>
        </footer>
      </body>
    </html>
  );
});
