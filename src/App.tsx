import { Router } from "./Router";
import NavigationBar from "./components/NavigationBar";

const App = () => (
  <div
    style={{
      height: "100%",
      display: "flex",
    }}
  >
    <NavigationBar />
    <div
      style={{
        boxSizing: "border-box",
        flexGrow: 1,
        padding: "2rem 2rem 0 2rem",
      }}
    >
      <Router />
    </div>
  </div>
);

export default App;
