import React, { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Typography,
  Select,
  Option,
  Button,
  Input,
  Spinner,
} from "@material-tailwind/react";
import api from "../../configs/api";
import { useSearchParams } from "react-router-dom";

export function UnmatchedDataReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [counts, setCounts] = useState({});
  const [selectedType, setSelectedType] = useState(searchParams.get("type") || "city");
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [newValue, setNewValue] = useState("");
  const urlType = searchParams.get("type");

  useEffect(() => {
    if (urlType && urlType !== selectedType) {
      setSelectedType(urlType);
    }
  }, [urlType]);

  const backendUrl = import.meta.env.VITE_API_URL || "http://localhost:8001";

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    if (selectedType) {
      fetchList(selectedType);
    } else {
      setListData([]);
    }
  }, [selectedType]);

  const fetchCounts = async () => {
    try {
      const res = await api.get(`/api/unmatched/counts`);
      if (res.data.status === "success") {
        setCounts(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching counts:", error);
    }
  };

  const fetchList = async (dataType) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/unmatched/list`, {
        params: { data_type: dataType, limit: 50 },
      });
      if (res.data.status === "success") {
        setListData(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFixSubmit = async (recordId, masterId) => {
    if (!newValue.trim()) {
      alert("Please enter a new value");
      return;
    }

    try {
      const res = await api.post(`/api/unmatched/fix`, {
        id: recordId,
        master_id: masterId,
        data_type: selectedType,
        new_value: newValue.trim(),
      });

      if (res.data.status === "success") {
        // Optimistic UI update: Remove the corrected row from list
        setListData((prev) => prev.filter((item) => item.id !== recordId));
        // Update count locally
        setCounts((prev) => ({
          ...prev,
          [selectedType]: Math.max(0, (prev[selectedType] || 1) - 1),
        }));
        setEditRow(null);
        setNewValue("");
      } else {
        alert(res.data.message || "Error submitting correction");
      }
    } catch (error) {
      console.error("Error submitting fix:", error);
      alert("Error submitting fix");
    }
  };

  return (
    <div className="mt-12 mb-8 flex flex-col gap-12">
      <Card>
        <CardHeader variant="gradient" color="gray" className="mb-8 p-6">
          <Typography variant="h6" color="white">
            Unmatched Data Review
          </Typography>
        </CardHeader>
        <CardBody className="px-4 pt-0 pb-2">
          {/* Dashboard Counts Summary */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(counts).length > 0 ? (
              Object.entries(counts).map(([type, count]) => (
                <div
                  key={type}
                  className={`p-4 border rounded-xl cursor-pointer transition-colors ${
                    selectedType === type ? "bg-blue-50 border-blue-500" : "hover:bg-gray-50"
                  }`}
                  onClick={() => {
                    setSelectedType(type);
                    setSearchParams({ type });
                  }}
                >
                  <Typography variant="h6" color="blue-gray" className="capitalize">
                    {type.replace("_", " ")}
                  </Typography>
                  <Typography variant="h4" color={count > 0 ? "red" : "green"}>
                    {count}
                  </Typography>
                </div>
              ))
            ) : (
              <Typography className="text-gray-500">No unmatched data found.</Typography>
            )}
          </div>

          {/* Drill-Down List */}
          {selectedType ? (
            <div>
              <Typography variant="h6" color="blue-gray" className="mb-4 capitalize">
                Pending {selectedType.replace("_", " ")} Issues (Showing up to 50)
              </Typography>
              
              {loading ? (
                <div className="flex justify-center p-8">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : listData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] table-auto">
                    <thead>
                      <tr>
                        {["Review ID", "Data Type", "Invalid Value", "Correction Status", "Created At", "Action"].map((el) => (
                          <th
                            key={el}
                            className="border-b border-blue-gray-50 py-3 px-4 text-left"
                          >
                            <Typography
                              variant="small"
                              className="text-[11px] font-bold uppercase text-blue-gray-400"
                            >
                              {el}
                            </Typography>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {listData.map((item, key) => {
                        const className = `py-3 px-5 ${
                          key === listData.length - 1 ? "" : "border-b border-blue-gray-50"
                        }`;

                        return (
                          <tr key={item.review_id}>
                            <td className={className}>
                              <Typography className="text-xs font-semibold text-blue-gray-600">
                                {item.review_id}
                              </Typography>
                            </td>
                            <td className={className}>
                              <Typography className="text-xs font-normal text-blue-gray-500 capitalize">
                                {item.data_type}
                              </Typography>
                            </td>
                            <td className={className}>
                              <Typography className="text-xs font-normal text-blue-gray-500">
                                {item.invalid_value || <i>[Empty]</i>}
                              </Typography>
                            </td>
                            <td className={className}>
                              <Typography className={`text-xs font-bold ${item.correction_status === 'pending' ? 'text-orange-500' : 'text-green-500'} uppercase`}>
                                {item.correction_status}
                              </Typography>
                            </td>
                            <td className={className}>
                              <Typography className="text-xs font-normal text-blue-gray-500">
                                {new Date(item.created_at).toLocaleString()}
                              </Typography>
                            </td>
                            <td className={className}>
                              {editRow === item.review_id ? (
                                <div className="flex gap-2 items-center">
                                  <Input
                                    size="sm"
                                    placeholder="New Value"
                                    value={newValue}
                                    onChange={(e) => setNewValue(e.target.value)}
                                  />
                                  <Button size="sm" color="green" onClick={() => handleFixSubmit(item.review_id, null)}>
                                    Save
                                  </Button>
                                  <Button size="sm" variant="text" color="red" onClick={() => setEditRow(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              ) : (
                                <Button size="sm" variant="outlined" color="blue" onClick={() => {
                                  setEditRow(item.review_id);
                                  setNewValue(item.invalid_value || "");
                                }}>
                                  Fix
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <Typography className="text-gray-500 p-4">All caught up! No pending items here.</Typography>
              )}
            </div>
          ) : (
            <Typography className="text-gray-500 p-4 text-center mt-8">Please select a category above to view pending items.</Typography>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default UnmatchedDataReview;
