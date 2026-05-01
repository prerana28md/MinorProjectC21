import React from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Fix default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

const HotelMap = ({ hotels }) => {
  if (!hotels || hotels.length === 0) {
    return <div className="text-muted">No hotels to display</div>;
  }

  const center = [hotels[0].lat, hotels[0].lon];

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: "400px", width: "100%", borderRadius: "10px" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {hotels.map((hotel, i) => (
        <Marker key={i} position={[hotel.lat, hotel.lon]}>
          <Popup>
            <strong>{hotel.name}</strong>
            <br />
            Type: {hotel.type}
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

export default HotelMap;