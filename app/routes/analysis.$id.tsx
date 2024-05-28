import React, { useEffect, useState } from "react";
import { useLoaderData } from "@remix-run/react";
import { json } from "@remix-run/node";
import { prisma } from "~/utils/prisma.server";
import * as pkg from "@syncfusion/ej2-react-charts";

const {
  ChartComponent,
  SeriesCollectionDirective,
  SeriesDirective,
  LineSeries,
  Inject,
  Category,
  Tooltip,
  Legend,
  Highlight,
  DateTime,
} = pkg;

export async function loader({ params }) {
  const analysisResult = await prisma.analysisResult.findUnique({
    where: { id: parseInt(params.id, 10) },
  });
  if (!analysisResult) {
    throw new Response("Not Found", { status: 404 });
  }
  return json(analysisResult);
}

export default function AnalysisResult() {
  const analysisResult = useLoaderData();
  const [realPartSeries, setRealPartSeries] = useState([]);
  const [imagPartSeries, setImagPartSeries] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  useEffect(() => {
    if (analysisResult) {
      const {
        dfRealPartX,
        dfRealPartY,
        dfImaginaryPartX,
        dfImaginaryPartY,
        imaginaryPartX,
        imaginaryPartY,
      } = analysisResult;

      const parseJsonData = (data, defaultValue = []) => {
        try {
          return JSON.parse(data);
        } catch (e) {
          console.error("Error parsing JSON data:", e);
          return defaultValue;
        }
      };

      const realPartX = parseJsonData(dfRealPartX);
      const realPartY = parseJsonData(dfRealPartY);
      const imagPartX = parseJsonData(dfImaginaryPartX);
      const imagPartY = parseJsonData(dfImaginaryPartY);
      const loadedX = parseJsonData(imaginaryPartX);
      const loadedY = parseJsonData(imaginaryPartY);

      const validateData = (xData, yData) => {
        if (!Array.isArray(xData) || !Array.isArray(yData)) return false;
        return xData.length === yData.length;
      };

      const isRealPartValid = validateData(realPartX, realPartY);
      const isImagPartValid = validateData(imagPartX, imagPartY);
      const isLoadedDataValid = validateData(loadedX, loadedY);

      if (!isRealPartValid || !isImagPartValid || !isLoadedDataValid) {
        console.error("Error: Los datos del gráfico no son válidos.");
        return;
      }

      setRealPartSeries([
        {
          name: "Real Part (Fitted)",
          data: realPartX.map((x, i) => ({ x, y: realPartY[i] })),
        },
        {
          name: "Loaded Data",
          data: loadedX.map((x, i) => ({ x, y: loadedY[i] })),
        },
      ]);

      setImagPartSeries([
        {
          name: "Imaginary Part",
          data: imagPartX.map((x, i) => ({ x, y: imagPartY[i] })),
        },
      ]);

      setDataLoaded(true);
    }
  }, [analysisResult]);

  if (!dataLoaded) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="max-w-4xl px-4 py-10 sm:px-6 lg:px-8 mx-auto">
      <h2 className="text-xl font-bold text-gray-800 dark:text-neutral-200">
        Resultado del Análisis
      </h2>
      <div className="bg-white rounded-xl shadow p-4 sm:p-7 dark:bg-neutral-800">
        <div className="mb-4">
          <p><strong>Nombre del análisis:</strong> {analysisResult.analysisName}</p>
          <p><strong>Descripción del análisis:</strong> {analysisResult.analysisDescription}</p>
        </div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-800 dark:text-neutral-200">Detalles del análisis</h3>
          <ul className="list-disc list-inside">
            <li><strong>Chisq:</strong> {analysisResult.chisq}</li>
            <li><strong>Lambda Low:</strong> {analysisResult.lamdaLow}</li>
            <li><strong>Lambda High:</strong> {analysisResult.lamdaHigh}</li>
            <li><strong>Lambda Init:</strong> {analysisResult.lamdaInit}</li>
            <li><strong>Delta Chi:</strong> {analysisResult.deltachi}</li>
            <li><strong>Tolerancia:</strong> {analysisResult.tolerance}</li>
          </ul>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-neutral-200">Real Part</h3>
          <ChartComponent
            id="real-part-chart"
            primaryXAxis={{ title: 'X Values' }}
            primaryYAxis={{ title: 'Y Values' }}
            title="Real Part"
            tooltip={{ enable: true }}
          >
            <Inject services={[LineSeries, Category, Tooltip, Legend, Highlight, DateTime]} />
            <SeriesCollectionDirective>
              {realPartSeries.map((series, index) => (
                <SeriesDirective key={index} dataSource={series.data} xName="x" yName="y" name={series.name} type="Line" />
              ))}
            </SeriesCollectionDirective>
          </ChartComponent>
        </div>

        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-800 dark:text-neutral-200">Imaginary Part</h3>
          <ChartComponent
            id="imaginary-part-chart"
            primaryXAxis={{ title: 'X Values' }}
            primaryYAxis={{ title: 'Y Values' }}
            title="Imaginary Part"
            tooltip={{ enable: true }}
          >
            <Inject services={[LineSeries, Category, Tooltip, Legend, Highlight, DateTime]} />
            <SeriesCollectionDirective>
              {imagPartSeries.map((series, index) => (
                <SeriesDirective key={index} dataSource={series.data} xName="x" yName="y" name={series.name} type="Line" />
              ))}
            </SeriesCollectionDirective>
          </ChartComponent>
        </div>
      </div>
    </div>
  );
}
