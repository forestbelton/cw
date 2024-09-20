import { useEffect, useState } from "react";
import { API_CLIENT, Program } from "../api";
import { Link, useLocation } from "wouter";
import Button from "../components/Button";

const ProgramListPage = () => {
  const [_location, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [programs, setPrograms] = useState<Program[]>([]);

  useEffect(() => {
    API_CLIENT.getUserPrograms().then((programs) => {
      setLoading(false);
      setPrograms(programs);
    });
  }, []);

  return loading ? (
    <div>Loading...</div>
  ) : (
    <div>
      <div>
        <Button
          label="New program"
          onClick={() => setLocation("/programs/new")}
        />
      </div>
      {programs.map((program) => (
        <div
          key={program.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "1rem",
          }}
        >
          <Link to={`/programs/${program.id}`}>{program.id}</Link>
          <Link to={`/programs/${program.id}/debugger`}>Debug</Link>
        </div>
      ))}
    </div>
  );
};

export default ProgramListPage;
