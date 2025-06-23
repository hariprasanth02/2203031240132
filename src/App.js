import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate, useParams, Link } from "react-router-dom";
import { Container, TextField, Button, Typography, Alert, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from "@mui/material";
import { nanoid } from "nanoid";

const Tracker = {
  writeLog: (info) => {
    window.__MY_LOGGER__?.log({
      msg: info.msg,
      payload: info.payload,
      time: new Date()
    });
  },
};

const storage = new Map();

function generateCode() {
  let id;
  do {
    id = nanoid(6);
  } while (storage.has(id));
  return id;
}

function ShortenTool() {
  const [targetLink, setTargetLink] = useState("");
  const [duration, setDuration] = useState("");
  const [alias, setAlias] = useState("");
  const [finalLink, setFinalLink] = useState("");
  const [feedback, setFeedback] = useState("");
  const navigate = useNavigate();

  const isLinkValid = (link) => {
    try {
      new URL(link);
      return true;
    } catch {
      return false;
    }
  };

  const createShortLink = () => {
    setFeedback("");
    Tracker.writeLog({ msg: "Processing new short link", payload: { targetLink, duration, alias } });

    if (!isLinkValid(targetLink)) {
      setFeedback("Provided link is invalid.");
      return;
    }

    const expiry = Date.now() + ((parseInt(duration) || 30) * 60000);
    let id = alias.trim();

    if (id) {
      if (!/^[a-zA-Z0-9]{1,15}$/.test(id)) {
        setFeedback("Alias must be alphanumeric, max 15 characters.");
        return;
      }
      if (storage.has(id)) {
        setFeedback("Alias already in use.");
        return;
      }
    } else {
      id = generateCode();
    }

    storage.set(id, {
      destination: targetLink,
      created: Date.now(),
      expires: expiry,
      hits: 0
    });

    Tracker.writeLog({ msg: "Short link created", payload: { id, targetLink, expiry } });
    setFinalLink(`http://localhost:3000/${id}`);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5, p: 4, bgcolor: "#fefefe", borderRadius: 2, boxShadow: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>Short URL Generator</Typography>
      <TextField label="Destination URL" value={targetLink} onChange={(e) => setTargetLink(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <TextField label="Active Time (minutes)" value={duration} onChange={(e) => setDuration(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <TextField label="Custom Alias (optional)" value={alias} onChange={(e) => setAlias(e.target.value)} fullWidth sx={{ mb: 2 }} />
      <Button variant="contained" sx={{ width: "100%", mb: 2 }} onClick={createShortLink}>Generate Link</Button>

      {finalLink && (
        <Alert severity="success">
          Your link: <a href={finalLink}>{finalLink}</a>
        </Alert>
      )}

      {feedback && (
        <Alert severity="error" sx={{ mt: 2 }}>{feedback}</Alert>
      )}

      <Button variant="outlined" sx={{ mt: 4, width: "100%" }} onClick={() => navigate("/records")}>
        View All Links
      </Button>
    </Container>
  );
}

function RecordsPage() {
  const navigate = useNavigate();
  const [allData, setAllData] = useState([]);

  useEffect(() => {
    const list = Array.from(storage.entries()).map(([id, info]) => ({
      id,
      ...info
    }));
    setAllData(list);
    Tracker.writeLog({ msg: "Accessed Records Page", payload: list });
  }, []);

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>All Generated Links</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Alias</TableCell>
              <TableCell>Original Link</TableCell>
              <TableCell>Expiry</TableCell>
              <TableCell>Clicks</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allData.map((item) => (
              <TableRow key={item.id}>
                <TableCell><Link to={`/${item.id}`}>{item.id}</Link></TableCell>
                <TableCell>{item.destination}</TableCell>
                <TableCell>{new Date(item.expires).toLocaleString()}</TableCell>
                <TableCell>{item.hits}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Button variant="outlined" sx={{ mt: 3 }} onClick={() => navigate("/")}>
        Return to Generator
      </Button>
    </Container>
  );
}

function LinkRedirect() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const record = storage.get(id);
    Tracker.writeLog({ msg: "Attempt to open short link", payload: { id } });

    if (!record) {
      setErrorMsg("Alias does not exist.");
      return;
    }
    if (Date.now() > record.expires) {
      setErrorMsg("This link is no longer active.");
      return;
    }

    record.hits += 1;
    window.location.href = record.destination;
  }, [id]);

  if (errorMsg) {
    return (
      <Container sx={{ mt: 5 }}>
        <Alert severity="error">{errorMsg}</Alert>
        <Button variant="contained" sx={{ mt: 2 }} onClick={() => navigate("/")}>
          Back to Home
        </Button>
      </Container>
    );
  }

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ShortenTool />} />
        <Route path="/records" element={<RecordsPage />} />
        <Route path="/:id" element={<LinkRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}
