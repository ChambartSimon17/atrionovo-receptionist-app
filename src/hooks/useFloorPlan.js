import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";

import { useAuth } from "../context/auth-context";
import { api } from "../services/api";

// ======================================================
// useFloorPlan
// ======================================================
//
// The floor plan of the business: its areas (rooms or
// floors), the elements and tables on each, and for
// salons the bookable treatment rooms an element can
// be linked to. Loaded when the screen comes into view.
//
// An area grows to fit what is drawn on it, so tables
// placed before the floor plan existed are never cut off.
// ======================================================

function normalize(plan) {
  const tables = (plan?.tables ?? []).map((table) => ({
    ...table,
    shape: table.shape || "SQUARE",
    width: table.width || 80,
    height: table.height || 80,
    rotation: table.rotation || 0,
  }));
  const elements = plan?.elements ?? [];
  const firstAreaId = plan?.areas?.[0]?.id ?? null;

  const areas = (plan?.areas ?? []).map((area) => {
    const items = [
      ...tables.filter((table) => (table.areaId ?? firstAreaId) === area.id),
      ...elements.filter((element) => element.areaId === area.id),
    ];

    return {
      ...area,
      width: Math.max(area.width || 1200, ...items.map((item) => item.x + item.width + 60)),
      height: Math.max(area.height || 900, ...items.map((item) => item.y + item.height + 60)),
    };
  });

  return {
    areas,
    elements,
    tables: tables.map((table) => ({ ...table, areaId: table.areaId ?? firstAreaId })),
    rooms: plan?.rooms ?? [],
  };
}

export default function useFloorPlan() {
  const { business, accessToken } = useAuth();

  const [plan, setPlan] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    if (!business?.id) {
      return null;
    }

    try {
      const response = await api.getFloorPlan(business.id, accessToken);
      const next = normalize(response?.data ?? response);

      setPlan(next);
      setError(null);

      return next;
    } catch (loadError) {
      setError(loadError?.message || "De plattegrond kon niet worden geladen.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, business?.id]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const save = useCallback(
    async (next) => {
      const response = await api.saveFloorPlan(
        business.id,
        {
          areas: next.areas.map(({ id, name, width, height }) => ({ id, name, width, height })),
          elements: next.elements,
          tables: next.tables,
        },
        accessToken
      );
      const saved = normalize(response?.data ?? response);

      setPlan(saved);

      return saved;
    },
    [accessToken, business?.id]
  );

  return { plan, setPlan, isLoading, error, reload, save };
}

export { normalize as normalizeFloorPlan };
