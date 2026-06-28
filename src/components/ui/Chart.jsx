'use client';

import dynamic from 'next/dynamic';

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

export default function Chart({ type, series, options, height = 350, width = '100%' }) {
  return <ApexChart type={type} series={series} options={options} height={height} width={width} />;
}
