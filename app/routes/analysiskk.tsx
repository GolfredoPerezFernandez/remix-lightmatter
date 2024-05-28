import { redirect } from "@remix-run/server-runtime";
import React, { useState, useCallback, useEffect, useRef, lazy, Suspense, memo } from "react";
import { useDropzone } from "react-dropzone-esm";

const ApexCharts = lazy(() => import("react-apexcharts"));

export function ClientOnly({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted ? <>{children}</> : null;
}

const MemoizedApexCharts = memo(({ options, series }) => (
  <ApexCharts options={options} series={series} type="line" height={350} />
));

export default function Analysis() {
  const [formData, setFormData] = useState({
    analysisName: "",
    analysisDescription: "",
  });
  const [loading, setLoading] = useState(false);  // Estado de carga
  const [txtData, setTxtData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const inputRef = useRef();

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const data = text.trim().split(/\s+/).map(Number);
      const formattedData = [];
      for (let i = 0; i < data.length; i += 2) {
        formattedData.push([data[i], data[i + 1]]);
      }
      setTxtData(formattedData);
      setChartData([{ name: "Datos cargados", data: formattedData }]);
    };
    reader.readAsText(file);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    accept: ".txt,.dat",
    onDrop,
    noClick: true
  });

  const chartOptions = {
    chart: {
      type: "line",
      height: 350,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    series: chartData,
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "straight",
      width: 4,
    },
    xaxis: {
      type: 'numeric',
      title: {
        text: 'X Values'
      }
    },
    yaxis: {
      labels: {
        formatter: (value) => (value >= 1000 ? `${value / 1000}k` : value),
      },
      title: {
        text: 'Y Values'
      }
    },
  };

  const handleInputChange = (event, field) => {
    const value = event.target.value;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);  // Activa el estado de carga
    const data = {
      ...formData,
      partX: txtData.map(d => d[0]),
      partY: txtData.map(d => d[1]),
    };
    
    const response = await fetch('/api/analysiskk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      const result = await response.json();
      window.location.href = `/analysis/${result.id}`;  // Redirige al nuevo análisis
    } else {
      setLoading(false);  // Desactiva el estado de carga en caso de error
    }
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  return (
    <div className="relative h-screen w-full lg:ps-64">
      <div className="max-w-4xl px-4 py-10 sm:px-6 lg:px-8 mx-auto">
        <div className="bg-white rounded-xl shadow p-4 sm:p-7 dark:bg-neutral-800">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-200">
              Análisis
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-12 gap-2 sm:gap-6">
              <div className="sm:col-span-3">
                <label className="inline-block text-sm text-gray-800 mt-2.5 dark:text-neutral-200">
                  Nombre del análisis
                </label>
              </div>
              <div className="sm:col-span-9">
                <input
                  name="analysisName"
                  value={formData.analysisName}
                  onChange={(e) => handleInputChange(e, "analysisName")}
                  aria-label="analysisName"
                  type="text"
                  className="py-2 px-3 block w-full border-gray-200 shadow-sm text-sm rounded-lg focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="inline-block text-sm text-gray-800 mt-2.5 dark:text-neutral-200">
                  Descripción del análisis
                </label>
              </div>
              <div className="sm:col-span-9">
                <textarea
                  name="analysisDescription"
                  value={formData.analysisDescription}
                  onChange={(e) => handleInputChange(e, "analysisDescription")}
                  className="py-2 px-3 block w-full border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-neutral-800 dark:border-neutral-700 dark:text-neutral-400 dark:placeholder-neutral-500 dark:focus:ring-neutral-600"
                  rows="6"
                  placeholder="Escribe la descripción del análisis..."
                ></textarea>
              </div>

              <div className="sm:col-span-3">
                <label className="inline-block text-sm text-gray-800 mt-2.5 dark:text-neutral-200">
                  Cargar archivo de datos
                </label>
              </div>
              <div className="sm:col-span-9">
                <div
                  {...getRootProps()}
                  onClick={handleClick}
                  className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded cursor-pointer"
                >
                  <input {...getInputProps()} ref={inputRef} />
                  <p className="text-gray-500">
                    Arrastra y suelta algunos archivos aquí, o haz clic para
                    seleccionar archivos
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-x-2">
            
                {loading ? (
                  <div className="animate-spin inline-block size-6 border-[3px] border-current border-t-transparent text-blue-600 rounded-full dark:text-blue-500" role="status" aria-label="loading">
                  <span className="sr-only">Loading...</span>
                </div>
                ) :   <button
                type="submit"
                className="py-2 px-3 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none"
                disabled={loading}
              >
                  "Analizar Espectro"
                
              </button>}
            </div>
          </form>

          <div className="mt-8">
            <ClientOnly>
              <Suspense fallback={<div>Cargando...</div>}>
                <MemoizedApexCharts
                  options={chartOptions}
                  series={chartOptions.series}
                />
              </Suspense>
            </ClientOnly>
          </div>
        </div>
      </div>
    </div>
  );
}
