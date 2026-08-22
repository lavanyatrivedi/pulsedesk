import app from './api/index';

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`PulseDesk API server listening on http://localhost:${PORT}`);
});
