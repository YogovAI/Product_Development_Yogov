import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import DataMapper from './pages/DataMapper';
import Sources from './pages/Sources';
import Spark from './pages/Spark';
import RAG from './pages/RAG';
import TransformTemplate from './pages/TransformTemplate';
import TransformTemplateDetails from './pages/TransformTemplateDetails';
import Dask from './pages/Dask';
import DatabaseServices from './pages/DatabaseServices';
import DatalakeServices from './pages/DatalakeServices';
import ClusterServices from './pages/ClusterServices';
import OrchestrationServices from './pages/OrchestrationServices';
import ExtractorServices from './pages/ExtractorServices';
import ExtractorDetails from './pages/ExtractorDetails';
import LoaderServices from './pages/LoaderServices';

import Home from './pages/Home';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="mapper" element={<DataMapper />} />
          <Route path="loaders" element={<LoaderServices />} />
          <Route path="sources" element={<Sources />} />
          <Route path="extractors" element={<ExtractorServices />} />
          <Route path="extractors/:id" element={<ExtractorDetails />} />
          <Route path="spark" element={<Spark />} />
          <Route path="infra">
            <Route path="db" element={<DatabaseServices />} />
            <Route path="datalake" element={<DatalakeServices />} />
            <Route path="cluster" element={<ClusterServices />} />
            <Route path="orchestration" element={<OrchestrationServices />} />
          </Route>
          <Route path="rag" element={<RAG />} />
          <Route path="transform" element={<TransformTemplate />} />
          <Route path="transform/:id" element={<TransformTemplateDetails />} />
          <Route path="dask" element={<Dask />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
