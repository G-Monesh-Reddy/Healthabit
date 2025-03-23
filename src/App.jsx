import React, { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { format, parseISO, isAfter } from "date-fns";

const formatResponse = (response) => {
    return response.replace(/\\(.?)\\*/g, "<br/><strong>$1</strong><br/>");
};

const App = () => {
    const apiKey = "AIzaSyB39ssJXBlTPxYVniAg3CyI_DxC7x0DVr4"; // Use environment variable for security
    const [data, setData] = useState({});
    const [suggestion, setSuggestion] = useState("");
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [editMode, setEditMode] = useState(false);
    const [activeView, setActiveView] = useState("analytics");
    const [loading, setLoading] = useState(false);

    const formatDate = (date) => {
        return date.toISOString().split("T")[0];
    };

    const isFutureDate = (date) => {
        return isAfter(date, new Date());
    };

    const handleInputChange = (field, value) => {
        if (isFutureDate(selectedDate)) {
            alert("Cannot enter data for future dates.");
            return;
        }
        const date = formatDate(selectedDate);
        setData((prev) => ({
            ...prev,
            [date]: { ...prev[date], [field]: Number(value) || 0 },
        }));
    };

    const fetchSuggestion = async () => {
        if (!apiKey) {
            setSuggestion("API key is missing. Please set it up correctly.");
            return;
        }

        setLoading(true);
        setSuggestion("");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const generationConfig = {
            temperature: 1,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            responseMimeType: "text/plain",
        };

        const chatSession = model.startChat({ generationConfig, history: [] });

        const prompt = `Here is the daily activity data for the entire month:\n${Object.entries(
            data
        )
            .map(
                ([date, details]) =>
                    `Date: ${date}, Steps: ${details.steps || 0}, Running: ${
                        details.running || 0
                    } km, Sleep: ${details.sleep || 0} hours`
            )
            .join(
                "\n"
            )}\n\nSuggest a health improvement plan for the next day.`;

        try {
            const result = await chatSession.sendMessage(prompt);
            const formattedResponse = formatResponse(result.response.text());
            setSuggestion(formattedResponse);
        } catch (error) {
            console.error("Error fetching suggestion:", error);
            setSuggestion("Failed to fetch suggestion.");
        } finally {
            setLoading(false);
        }
    };

    const loadSavedData = () => {
        const date = formatDate(selectedDate);
        return data[date] || { steps: "", running: "", sleep: "" };
    };

    const handleDateChange = (e) => {
        const newDate = parseISO(e.target.value);
        if (isFutureDate(newDate)) {
            alert("Cannot select future dates.");
            return;
        }
        setSelectedDate(newDate);
        setEditMode(false);
    };

    const toggleEditMode = () => {
        if (isFutureDate(selectedDate)) {
            alert("Cannot edit data for future dates.");
            return;
        }
        setEditMode(!editMode);
    };

    const generateChartData = (field) => ({
        labels: Object.keys(data),
        datasets: [
            {
                label: field,
                data: Object.values(data).map((entry) => entry[field] || 0),
                borderColor: "#3b82f6",
                backgroundColor: "rgba(59, 130, 246, 0.5)",
            },
        ],
    });

    return (
        <div className="bg-gradient-to-r from-gray-900 to-blue-900 text-white p-4 sm:p-6 md:p-8 lg:p-10 min-h-screen">
            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-center">
                Healthabit Analytics Dashboard
            </h2>

            <div className="max-w-4xl mx-auto bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg">
                <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-6">
                    <button
                        onClick={() => setActiveView("analytics")}
                        className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition duration-300 ${
                            activeView === "analytics"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-gray-600 hover:bg-gray-700"
                        }`}
                    >
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveView("suggestions")}
                        className={`px-4 sm:px-6 py-2 rounded-lg font-bold transition duration-300 ${
                            activeView === "suggestions"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-gray-600 hover:bg-gray-700"
                        }`}
                    >
                        Suggestions
                    </button>
                </div>
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Select Date
                    </label>
                    <input
                        type="date"
                        value={format(selectedDate, "yyyy-MM-dd")}
                        onChange={handleDateChange}
                        max={format(new Date(), "yyyy-MM-dd")}
                        className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Steps
                        </label>
                        <input
                            type="number"
                            placeholder="Steps"
                            value={loadSavedData().steps}
                            onChange={(e) =>
                                handleInputChange("steps", e.target.value)
                            }
                            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!editMode || isFutureDate(selectedDate)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Running (km)
                        </label>
                        <input
                            type="number"
                            placeholder="Running (km)"
                            value={loadSavedData().running}
                            onChange={(e) =>
                                handleInputChange("running", e.target.value)
                            }
                            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!editMode || isFutureDate(selectedDate)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Sleep (hours)
                        </label>
                        <input
                            type="number"
                            placeholder="Sleep (hours)"
                            value={loadSavedData().sleep}
                            onChange={(e) =>
                                handleInputChange("sleep", e.target.value)
                            }
                            className="w-full p-2 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={!editMode || isFutureDate(selectedDate)}
                        />
                    </div>
                </div>
                <div className="flex justify-center mb-6">
                    <button
                        onClick={toggleEditMode}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg transition duration-300 transform hover:scale-105 w-full sm:w-auto"
                    >
                        {editMode ? "Save Data" : "Edit Data"}
                    </button>
                </div>
                <div className="mb-6">
                    <button
                        onClick={() => setActiveView("steps")}
                        className={`px-4 py-2 rounded-lg font-bold transition duration-300 m-5 ${
                            activeView === "steps"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-gray-600 hover:bg-gray-700"
                        }`}
                    >
                        Steps Graph
                    </button>
                    <button
                        onClick={() => setActiveView("running")}
                        className={`px-4 py-2 rounded-lg font-bold transition duration-300 m-5 ${
                            activeView === "running"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-gray-600 hover:bg-gray-700"
                        }`}
                    >
                        Running Graph
                    </button>
                    <button
                        onClick={() => setActiveView("sleep")}
                        className={`px-4 py-2 rounded-lg font-bold transition duration-300 m-5 ${
                            activeView === "sleep"
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "bg-gray-600 hover:bg-gray-700"
                        }`}
                    >
                        Sleep Graph
                    </button>
                </div>

                {activeView === "steps" && (
                    <div className="bg-gray-700 p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold mb-4">
                            Step Count Graph
                        </h3>
                        <Line data={generateChartData("steps")} />
                    </div>
                )}

                {activeView === "running" && (
                    <div className="bg-gray-700 p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold mb-4">
                            Running Graph
                        </h3>
                        <Line data={generateChartData("running")} />
                    </div>
                )}

                {activeView === "sleep" && (
                    <div className="bg-gray-700 p-4 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold mb-4">Sleep Graph</h3>
                        <Line data={generateChartData("sleep")} />
                    </div>
                )}

                {activeView === "suggestions" && (
                    <div className="mt-6">
                        <button
                            onClick={fetchSuggestion}
                            disabled={loading}
                            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? "Fetching..." : "Get Suggestion"}
                        </button>
                        {loading && (
                            <div className="flex justify-center mt-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        )}
                        {suggestion && !loading && (
                            <div className="bg-gray-700 p-4 sm:p-6 rounded-lg shadow-md mt-4">
                                <h3 className="text-xl font-bold mb-4">
                                    Suggestion:
                                </h3>
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: suggestion,
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
