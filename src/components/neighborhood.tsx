"use client";

import { NeighborList } from "@/components/neighbor-list";
import type { Neighbor } from "@/lib/types";
import { useEffect, useState } from "react";

type Payload = {
  builtOn: Neighbor[];
  similar: Neighbor[];
  then: Neighbor[];
};

export function Neighborhood({ id }: { id: string }) {
  const [data, setData] = useState<Payload | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/neighborhood?id=${encodeURIComponent(id)}`)
      .then((res) => {
        if (!res.ok) throw new Error("fail");
        return res.json() as Promise<Payload>;
      })
      .then((payload) => {
        if (alive) setData(payload);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  if (failed) {
    return (
      <p className="text-base text-pretty text-neutral-600 sm:text-sm">
        Nearby papers did not load. The paper above is still here.
      </p>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="h-40 rounded-xl bg-neutral-50" />
        <div className="h-40 rounded-xl bg-neutral-50" />
        <div className="h-40 rounded-xl bg-neutral-50" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <NeighborList heading="Built on" items={data.builtOn} />
      <NeighborList heading="Similar" items={data.similar} />
      <NeighborList heading="Then" items={data.then} />
    </div>
  );
}
