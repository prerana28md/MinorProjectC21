import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Table,
  Button,
  Alert,
  Badge,
  Spinner
} from "react-bootstrap";
import axios from "axios";

// Leaflet
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix marker icons (important)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const API_BASE_URL = "http://127.0.0.1:5000";

/* ---------------------------
   🔥 HOTEL MAP COMPONENT
---------------------------- */
const HotelMap = ({ hotels }) => {
  if (!hotels || hotels.length === 0) {
    return <div className="text-muted mt-2">No hotels to display</div>;
  }

  const center = [hotels[0].lat, hotels[0].lon];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "400px", width: "100%", borderRadius: "10px" }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

      {hotels.map((hotel, i) => (
        <Marker key={i} position={[hotel.lat, hotel.lon]}>
          <Popup>
            <strong>{hotel.name}</strong>
            <br />
            Type: {hotel.type || "hotel"}
            <br />
            <a
              href={`https://www.google.com/maps?q=${hotel.lat},${hotel.lon}`}
              target="_blank"
              rel="noreferrer"
            >
              Open in Google Maps
            </a>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

/* ---------------------------
   🔥 MAIN COMPONENT
---------------------------- */
const BucketList = () => {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  // 🔥 hotel states
  const [hotelData, setHotelData] = useState(null);
  const [openHotelCity, setOpenHotelCity] = useState(null);
  const [loadingHotel, setLoadingHotel] = useState(null);

  const username = localStorage.getItem("username");

  /* ---------------------------
     Fetch Bucket List
  ---------------------------- */
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

  /* ---------------------------
     Remove item
  ---------------------------- */
  const handleRemove = async (idx) => {
    try {
      await axios.delete(`${API_BASE_URL}/user/${username}/bucket`, {
        data: { idx },
      });
      setItems(items.filter((_, i) => i !== idx));
    } catch {
      setError("Failed to remove item.");
    }
  };

  /* ---------------------------
     Fetch Hotels
  ---------------------------- */
  const fetchHotels = async (city, state) => {
    const place = `${city}, ${state}`;

    // toggle
    if (openHotelCity === place) {
      setOpenHotelCity(null);
      return;
    }

    setLoadingHotel(place);
    setError("");

    try {
      const res = await axios.get(`${API_BASE_URL}/nearbyplaces/hotels`, {
        params: { place, radius: 3000 },
      });

      setHotelData({ city: place, data: res.data });
      setOpenHotelCity(place);
    } catch {
      setError("Failed to fetch nearby hotels.");
    } finally {
      setLoadingHotel(null);
    }
  };

  /* ---------------------------
     RENDER
  ---------------------------- */
  return (
    <Container className="py-5">
      <h2 className="mb-4">Your Bucket List</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

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
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan="8" className="text-center text-muted">
                    No items in your bucket list yet.
                  </td>
                </tr>
              )}

              {items.map((d, idx) => {
                const city = d.city_name || d.city;
                const state = d.state_name || d.state;
                const placeKey = `${city}, ${state}`;

                return (
                  <React.Fragment key={idx}>
                    <tr>
                      <td>{idx + 1}</td>
                      <td>{state}</td>
                      <td>{city}</td>
                      <td>{d.category}</td>

                      <td>
                        <Badge bg="info">
                          {(d.tourist_rating || d.rating || 0).toFixed(1)}
                        </Badge>
                      </td>

                      <td>
                        {(d.risk_index || d.risk || 0).toFixed(1)}
                      </td>

                      <td>{d.best_time_to_visit || "Year-round"}</td>

                      <td>
                        <div className="d-flex gap-2">
                          {/* Remove */}
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleRemove(idx)}
                          >
                            Remove
                          </Button>

                          {/* Hotels */}
                          <Button
                            variant={
                              openHotelCity === placeKey
                                ? "dark"
                                : "outline-dark"
                            }
                            size="sm"
                            onClick={() => fetchHotels(city, state)}
                            disabled={loadingHotel === placeKey}
                          >
                            {loadingHotel === placeKey ? (
                              <Spinner size="sm" animation="border" />
                            ) : openHotelCity === placeKey ? (
                              "Hide Map"
                            ) : (
                              "Show Hotels"
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>

                    {/* 🔥 MAP ROW */}
                    {openHotelCity === placeKey &&
                      hotelData?.city === placeKey && (
                        <tr>
                          <td colSpan="8">
                            <div className="p-3 bg-light border rounded">
                              <strong>Nearby Hotels Map:</strong>

                              {hotelData.data.places.length === 0 ? (
                                <div className="text-muted mt-2">
                                  No hotels found nearby
                                </div>
                              ) : (
                                <HotelMap
                                  hotels={hotelData.data.places}
                                />
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </Table>
        </div>
      </div>
    </Container>
  );
};

export default BucketList;