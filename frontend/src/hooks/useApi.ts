import { useEffect, useRef } from "react";
import { useAsgardeo } from "@asgardeo/react";
import api from "../lib/api";

export function useApi() {
  const { getAccessToken } = useAsgardeo();
  const interceptorRef = useRef<number | null>(null);
  const getAccessTokenRef = useRef(getAccessToken);

  useEffect(() => {
    getAccessTokenRef.current = getAccessToken;
  });

  useEffect(() => {
    interceptorRef.current = api.interceptors.request.use(async (config) => {
      try {
        const token = await getAccessTokenRef.current();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.error("Failed to get access token:", error);
      }
      return config;
    });

    return () => {
      if (interceptorRef.current !== null) {
        api.interceptors.request.eject(interceptorRef.current);
      }
    };
  }, []);

  return api;
}
