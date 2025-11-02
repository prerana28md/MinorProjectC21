import React, { useEffect, useState, useCallback } from "react";
import { Container, Table, Button, Alert, Badge } from "react-bootstrap";
import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:5000";

const BucketList = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const username = localStorage.getItem("username");

  const fetchBucket = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/user/${username}/bucket`);
      setItems(res.data.bucket || []);
    } catch {
      setError("Failed to fetch your bucket list.");
    }
  }, [username]);

  useEffect(() => {
    fetchBucket();
  }, [fetchBucket]);

  const handleRemove = async (idx) => {
    try {
      await axios.delete(`${API_BASE_URL}/user/${username}/bucket`, { data: { idx } });
      setItems(items.filter((_, i) => i !== idx));
    } catch {
      setError("Failed to remove item.");
    }
  };

  return (
    <Container className="py-5">
      <h2 className="mb-4">Your Bucket List</h2>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}
      <div className="card shadow">
        <div className="card-body">
          <Table striped hover responsive>
            <thead>
              <tr>
                <th>#</th>
                <th>State</th>
                <th>City</th>
                <th>Category</th>
                <th>Rating</th>
                <th>Risk</th>
                <th>Time</th>
                <th>Remove</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted">No items in your bucket list yet.</td>
                </tr>
              )}
              {items.map((d, idx) => (
                <tr key={idx}>
                  <td>{idx + 1}</td>
                  <td>{d.state_name || d.state}</td>
                  <td>{d.city_name || d.city}</td>
                  <td>{d.category}</td>
                  <td><Badge bg="info">{(d.tourist_rating || d.rating || 0).toFixed(1)}</Badge></td>
                  <td>{(d.risk_index || d.risk || 0).toFixed(1)}</td>
                  <td>{d.best_time_to_visit || "Year-round"}</td>
                  <td>
                    <Button variant="danger" size="sm" onClick={() => handleRemove(idx)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    </Container>
  );
};

export default BucketList;
