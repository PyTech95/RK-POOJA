import { useEffect, useState } from "react";
import { api } from "./api";

let cached = null;

export function useWhatsApp() {
  const [data, setData] = useState(cached || { number: "919955095226", owner: "RK POOJA" });
  useEffect(() => {
    if (cached) return;
    api.get("/whatsapp/number")
      .then((r) => { cached = r.data; setData(r.data); })
      .catch(() => {});
  }, []);
  return data;
}

export const DEFAULT_WA_NUMBER = "919955095226";
