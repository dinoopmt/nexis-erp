import React, { useEffect, useState } from "react";
import { Search, Plus, AlertCircle, ChevronRight, Trash2, Edit2 } from "lucide-react";
import Modal from "../shared/Model";
import axios from "axios";
import { API_URL } from "../../config/config";

const Grouping = () => {
  const [groupings, setGroupings] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedDepartments, setExpandedDepartments] = useState(new Set());
  const [expandedSubdepartments, setExpandedSubdepartments] = useState(new Set());

  const [newGrouping, setNewGrouping] = useState({
    name: "",
    description: "",
    parentId: "", // If empty = Department (level 1), If set = Sub-Dept or Brand (level 2+)
    // Level will be auto-calculated by backend based on parentId
  });

  const [errors, setErrors] = useState({});

  // ✅ Fetch Groupings
  useEffect(() => {
    fetchGroupings();
  }, []);

  const fetchGroupings = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/groupings/getgroupings`);
      setGroupings(response.data.groupings || []);
      setDepartments(response.data.hierarchy?.departments || []);
      setError("");
    } catch (err) {
      setError("Failed to fetch groupings. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Validate Grouping
  const validateGrouping = () => {
    const newErrors = {};

    if (!newGrouping.name.trim())
      newErrors.name = "Grouping name is required";

    // If user selected a parent, validate that parent exists
    if (newGrouping.parentId) {
      const parentExists = groupings.some(g => g._id === newGrouping.parentId);
      if (!parentExists) {
        newErrors.parentId = "Selected parent does not exist";
      }
    }

    return newErrors;
  };

  // ✅ Open Add Modal
  const openAddModal = () => {
    setIsModalOpen(true);
    setIsEdit(false);
    setNewGrouping({
      name: "",
      description: "",
      parentId: "",
      // Backend will auto-calculate level: no parentId = level 1 (department)
    });
    setErrors({});
  };

  // ✅ Open Edit Modal
  const handleEdit = (grouping) => {
    setNewGrouping({
      name: grouping.name,
      description: grouping.description || "",
      parentId: grouping.parentId?._id || "",
      // Level is auto-calculated by backend
    });
    setEditId(grouping._id);
    setIsEdit(true);
    setIsModalOpen(true);
    setErrors({});
  };

  // ✅ Close Modal
  const closeModal = () => {
    setIsModalOpen(false);
    setIsEdit(false);
    setEditId(null);
    setErrors({});
    setError("");
  };

  // ✅ Save / Update
  const handleSaveGrouping = async () => {
    const validationErrors = validateGrouping();

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      console.log("📤 Sending grouping to API:", newGrouping);
      
      if (isEdit) {
        const response = await axios.put(
          `${API_URL}/groupings/updategrouping/${editId}`,
          newGrouping
        );
        console.log("✅ Update response:", response.data);
        setGroupings(
          groupings.map((g) => (g._id === editId ? response.data.grouping : g))
        );
        alert("Grouping updated successfully!");
      } else {
        const response = await axios.post(
          `${API_URL}/groupings/addgrouping`,
          newGrouping
        );
        console.log("✅ Create response:", response.data);
        setGroupings([...groupings, response.data.grouping]);
        alert("Grouping added successfully!");
      }
      closeModal();
      setError("");
      fetchGroupings();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        (isEdit ? "Failed to update grouping" : "Failed to add grouping");
      console.error("❌ API Error:", err.response?.status, err.response?.data);
      console.error("Request payload was:", newGrouping);
      setError(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Delete
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this grouping?"))
      return;

    setLoading(true);

    try {
      await axios.delete(`${API_URL}/groupings/deletegrouping/${id}`);
      setGroupings(groupings.filter((g) => g._id !== id));
      alert("Grouping deleted successfully!");
      setError("");
      fetchGroupings();
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Failed to delete grouping";
      setError(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Toggle Department Expansion
  const toggleDepartment = (deptId) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(deptId)) {
      newExpanded.delete(deptId);
    } else {
      newExpanded.add(deptId);
    }
    setExpandedDepartments(newExpanded);
  };

  // ✅ Toggle Subdepartment Expansion
  const toggleSubdepartment = (subDeptId) => {
    const newExpanded = new Set(expandedSubdepartments);
    if (newExpanded.has(subDeptId)) {
      newExpanded.delete(subDeptId);
    } else {
      newExpanded.add(subDeptId);
    }
    setExpandedSubdepartments(newExpanded);
  };

  // ✅ Get Subdepartments for a Department
  const getSubDepartmentsForParent = (parentId) => {
    return groupings.filter((g) => g.parentId?._id === parentId);
  };

  // ✅ Get groupings by level (1=Department, 2=SubDept, 3=Brand)
  const getGroupingsByLevel = (level) => {
    return groupings.filter((g) => {
      if (level === 1) return !g.parentId;
      if (level === 2) return g.parentId && getGroupingsByLevel(1).some(d => d._id === g.parentId?._id);
      if (level === 3) return g.parentId && getGroupingsByLevel(2).some(sd => sd._id === g.parentId?._id);
      return false;
    });
  };

  // ✅ Get brands for a sub-department
  const getBrandsForSubdepartment = (subdeptId) => {
    return groupings.filter((g) => g.parentId?._id === subdeptId && g.level === "3");
  };

  // ✅ Filter Groupings
  const filteredGroupings = groupings.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      (g.description && g.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-6 w-full flex flex-col min-h-[calc(100vh-120px)] pb-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 gap-4">
        <h1 className="text-2xl lg:text-3xl font-bold">Product Grouping</h1>

        <button
          onClick={openAddModal}
          disabled={loading}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition w-full lg:w-auto justify-center lg:justify-start disabled:opacity-50"
        >
          <Plus size={18} /> Add Grouping
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-300 rounded-lg flex items-start gap-3">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 mb-6 border rounded-lg px-3 py-2">
        <Search size={18} className="flex-shrink-0" />
        <input
          type="text"
          placeholder="Search grouping name or description..."
          className="border-0 p-0 outline-none w-full text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading State */}
      {loading && groupings.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading groupings...</p>
        </div>
      )}

      {/* Hierarchical View */}
      {!loading || groupings.length > 0 ? (
        <div className="border border-gray-200 rounded-lg overflow-hidden flex-grow flex flex-col">
          <div className="overflow-y-auto p-4">
            {departments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No groupings found. Create a new one to get started!
              </p>
            ) : (
              <div className="space-y-2">
                {departments
                  .filter((d) =>
                    filteredGroupings.some((fg) => fg._id === d._id)
                  )
                  .map((dept) => (
                    <div key={dept._id} className="border rounded-lg overflow-hidden">
                      {/* Department */}
                      <div className="bg-gray-50 p-4 flex items-center justify-between hover:bg-gray-100 transition">
                        <div
                          className="flex items-center gap-2 flex-grow cursor-pointer"
                          onClick={() => toggleDepartment(dept._id)}
                        >
                          <ChevronRight
                            size={18}
                            className={`transform transition ${
                              expandedDepartments.has(dept._id)
                                ? "rotate-90"
                                : ""
                            }`}
                          />
                          <div>
                            <p className="font-semibold text-gray-900">
                              {dept.name}
                            </p>
                            {dept.description && (
                              <p className="text-xs text-gray-600">
                                {dept.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => handleEdit(dept)}
                            disabled={loading}
                            className="text-blue-600 hover:bg-blue-50 p-2 rounded disabled:opacity-50"
                            title="Edit"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(dept._id)}
                            disabled={loading}
                            className="text-red-600 hover:bg-red-50 p-2 rounded disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Subdepartments */}
                      {expandedDepartments.has(dept._id) && (
                        <div className="bg-white border-t">
                          {getSubDepartmentsForParent(dept._id).length === 0 ? (
                            <p className="p-4 text-gray-500 text-sm italic">
                              No subdepartments
                            </p>
                          ) : (
                            <div className="divide-y">
                              {getSubDepartmentsForParent(dept._id)
                                .filter((sd) =>
                                  filteredGroupings.some(
                                    (fg) => fg._id === sd._id
                                  )
                                )
                                .map((subDept) => {
                                  const brands = getBrandsForSubdepartment(subDept._id);
                                  return (
                                    <div key={subDept._id}>
                                      {/* Subdepartment Row */}
                                      <div className="p-4 flex items-center justify-between hover:bg-gray-50 transition">
                                        <div className="flex items-center gap-2 flex-grow">
                                          {brands.length > 0 && (
                                            <button
                                              onClick={() => toggleSubdepartment(subDept._id)}
                                              className="p-0 hover:bg-gray-200 rounded"
                                              title="Toggle brands"
                                            >
                                              <ChevronRight
                                                size={16}
                                                className={`transform transition ${
                                                  expandedSubdepartments.has(subDept._id)
                                                    ? "rotate-90"
                                                    : ""
                                                }`}
                                              />
                                            </button>
                                          )}
                                          {brands.length === 0 && <div className="w-4" />}
                                          <div className="ml-4">
                                            <p className="font-medium text-gray-800">
                                              → {subDept.name}
                                            </p>
                                            {subDept.description && (
                                              <p className="text-xs text-gray-600">
                                                {subDept.description}
                                              </p>
                                            )}
                                          </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleEdit(subDept)}
                                            disabled={loading}
                                            className="text-blue-600 hover:bg-blue-50 p-2 rounded disabled:opacity-50"
                                            title="Edit"
                                          >
                                            <Edit2 size={16} />
                                          </button>
                                          <button
                                            onClick={() => handleDelete(subDept._id)}
                                            disabled={loading}
                                            className="text-red-600 hover:bg-red-50 p-2 rounded disabled:opacity-50"
                                            title="Delete"
                                          >
                                            <Trash2 size={16} />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Brands */}
                                      {expandedSubdepartments.has(subDept._id) && brands.length > 0 && (
                                        <div className="bg-gray-50 border-t divide-y">
                                          {brands.map((brand) => (
                                            <div
                                              key={brand._id}
                                              className="p-4 flex items-center justify-between hover:bg-gray-100 transition"
                                            >
                                              <div className="ml-16">
                                                <p className="font-medium text-gray-700">
                                                  ├─ {brand.name}
                                                </p>
                                                {brand.description && (
                                                  <p className="text-xs text-gray-600">
                                                    {brand.description}
                                                  </p>
                                                )}
                                              </div>

                                              {/* Actions */}
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => handleEdit(brand)}
                                                  disabled={loading}
                                                  className="text-blue-600 hover:bg-blue-50 p-2 rounded disabled:opacity-50"
                                                  title="Edit"
                                                >
                                                  <Edit2 size={16} />
                                                </button>
                                                <button
                                                  onClick={() => handleDelete(brand._id)}
                                                  disabled={loading}
                                                  className="text-red-600 hover:bg-red-50 p-2 rounded disabled:opacity-50"
                                                  title="Delete"
                                                >
                                                  <Trash2 size={16} />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} draggable={true}>
        <h2 className="text-lg lg:text-xl font-semibold mb-4">
          {isEdit ? "Edit Grouping" : "Add New Grouping"}
        </h2>

        <div className="flex flex-col gap-4 max-h-96 overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Name *
            </label>
            <input
              type="text"
              placeholder="Enter grouping name (e.g., Electronics, Clothing)"
              className={`w-full border p-2 rounded text-sm ${
                errors.name ? "border-red-500 bg-red-50" : ""
              }`}
              value={newGrouping.name}
              onChange={(e) =>
                setNewGrouping({
                  ...newGrouping,
                  name: e.target.value,
                })
              }
              disabled={loading}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Description
            </label>
            <textarea
              placeholder="Enter description..."
              className="w-full border p-2 rounded text-sm resize-none"
              rows="3"
              value={newGrouping.description}
              onChange={(e) =>
                setNewGrouping({
                  ...newGrouping,
                  description: e.target.value,
                })
              }
              disabled={loading}
            />
          </div>

          {/* Parent (Optional) - Backend auto-calculates level based on parentId */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Parent Grouping (Optional)
            </label>
            <select
              className={`w-full border p-2 rounded text-sm ${
                errors.parentId ? "border-red-500 bg-red-50" : ""
              }`}
              value={newGrouping.parentId}
              onChange={(e) =>
                setNewGrouping({
                  ...newGrouping,
                  parentId: e.target.value,
                })
              }
              disabled={loading}
            >
              <option value="">-- No Parent (Create as Department) --</option>
              {groupings
                .filter((g) => g._id !== editId && g.level !== "3") // Can't have brand as parent
                .map((grouping) => (
                  <option key={grouping._id} value={grouping._id}>
                    {grouping.name} (Level {grouping.level})
                  </option>
                ))}
            </select>
            {errors.parentId && (
              <p className="text-red-500 text-xs mt-1">{errors.parentId}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Leave empty to create a top-level department. Select a parent to create a sub-category. Level will be auto-calculated.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSaveGrouping}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 text-sm lg:text-base disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : isEdit ? "Update Grouping" : "Save Grouping"}
            </button>
            <button
              onClick={closeModal}
              disabled={loading}
              className="flex-1 bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400 text-sm lg:text-base disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Grouping;


