import React, { Component } from "react";
import logo from "./logo.svg";
import "./App.css";

class App extends Component {
  public render() {
    async function twitchRedirect() {
      const response = await fetch("/api/oauth/twitch").then((res) =>
        res.json()
      );

      window.location.replace(response.url);
    }

    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <p>
            Edit <code>src/App.tsx</code> and save to reload.
          </p>
          <a
            className="App-link"
            href="https://reactjs.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            Learn React
          </a>
          <button class-name="App-link" onClick={twitchRedirect}>
            Connect to Twitch
          </button>
        </header>
      </div>
    );
  }
}

export default App;
