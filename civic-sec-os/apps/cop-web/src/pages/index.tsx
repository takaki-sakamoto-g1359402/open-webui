import dynamic from "next/dynamic";
import Head from "next/head";
import { useMemo } from "react";

const Map = dynamic(() => import("react-map-gl").then(mod => mod.Map), {
  ssr: false,
});

export default function Home() {
  const layers = useMemo(
    () => [
      {
        id: "heat",
        type: "heatmap",
        source: {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [],
          },
        },
      },
    ],
    []
  );

  return (
    <>
      <Head>
        <title>Civic Security OS COP</title>
      </Head>
      <main className="h-screen">
        <Map
          reuseMaps
          initialViewState={{ latitude: 35.6762, longitude: 139.6503, zoom: 8 }}
          mapStyle={process.env.MAP_STYLE_URL}
          style={{ width: "100%", height: "100%" }}
        >
          {layers.map(layer => (
            <div key={layer.id}>{layer.id}</div>
          ))}
        </Map>
      </main>
    </>
  );
}
