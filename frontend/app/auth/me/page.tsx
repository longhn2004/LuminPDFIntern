"use client";

import { useEffect, useState } from "react";

export default function MePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to fetch user info");
        }
        setUser(data);
      } catch (err: any) {
        setError(err.message || "Failed to fetch user info");
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-2xl font-bold mb-4">User Info</h1>
      <div className="bg-white shadow-md rounded-lg p-6 w-80">
        <p><span className="font-semibold">Email:</span> {user?.email}</p>
        <p><span className="font-semibold">Email Verified:</span> {user?.isEmailVerified ? "Yes" : "No"}</p>
      </div>
    </div>
  );
}
