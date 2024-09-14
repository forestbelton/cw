import { Link } from "wouter";
import { ALL_ROUTES } from "./Router";

const NavigationBar = () => (
  <div
    style={{
      height: "100%",
      borderRight: "2px solid #a394f033",
      boxSizing: "border-box",
      padding: "2rem 2rem 0 2rem",
    }}
  >
    {Object.entries(ALL_ROUTES)
      .filter(([_path, route]) => typeof route["navName"] !== "undefined")
      .map(([path, route], i) => (
        <div key={i} style={{ marginBottom: "1rem" }}>
          <Link to={path}>{route.navName}</Link>
        </div>
      ))}
  </div>
);

export default NavigationBar;
