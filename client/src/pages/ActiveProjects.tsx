import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChartGantt, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'wouter';
import Navigation from '@/components/Navigation';
import ProjectTimer from '@/components/ProjectTimer';

export default function ActiveProjects() {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [itemsPerPage] = React.useState(6); // 6 projects per page for optimal mobile display

  const { data: allProjects, isLoading, error } = useQuery({
    queryKey: ["/api/projects"],
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/client/stats"],
  });

  // Filter for only active projects
  const projects = React.useMemo(() => {
    if (!allProjects || !Array.isArray(allProjects)) {
      return [];
    }
    return allProjects.filter((project: any) => project.status === 'active');
  }, [allProjects]);

  // Pagination logic
  const totalPages = Math.ceil((projects?.length || 0) / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = React.useMemo(() => {
    return projects.slice(startIndex, endIndex);
  }, [projects, startIndex, endIndex]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Active Projects
          </h1>
          <p className="text-slate-600">
            Track progress and manage your ongoing projects ({(stats as any)?.activeProjects || 0} active)
          </p>
        </div>

        {/* Projects Section with Pagination */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold text-slate-900">Active Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects && projects.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {paginatedProjects.map((project: any) => (
                    <ProjectTimer key={project.id} project={project} />
                  ))}
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-6 pt-4 border-t border-slate-200">
                    {/* Mobile-first compact layout */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-slate-600 hidden sm:block">
                        {startIndex + 1}-{Math.min(endIndex, projects.length)} of {projects.length}
                      </div>
                      
                      <div className="flex items-center justify-center gap-1 mx-auto sm:mx-0">
                        {/* Previous Page */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                        >
                          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                        
                        {/* Page Numbers - Mobile optimized */}
                        {(() => {
                          const pageNumbers = [];
                          const maxVisiblePages = 3; // Keep it minimal for mobile
                          let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                          let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                          
                          if (endPage - startPage < maxVisiblePages - 1) {
                            startPage = Math.max(1, endPage - maxVisiblePages + 1);
                          }
                          
                          // Show ellipsis if there are more pages before
                          if (startPage > 1) {
                            pageNumbers.push(
                              <Button
                                key={1}
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(1)}
                                className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                              >
                                1
                              </Button>
                            );
                            if (startPage > 2) {
                              pageNumbers.push(
                                <span key="ellipsis-start" className="px-1 text-slate-500 text-xs">
                                  ...
                                </span>
                              );
                            }
                          }
                          
                          // Show page numbers
                          for (let i = startPage; i <= endPage; i++) {
                            pageNumbers.push(
                              <Button
                                key={i}
                                variant={i === currentPage ? "default" : "outline"}
                                size="sm"
                                onClick={() => setCurrentPage(i)}
                                className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                              >
                                {i}
                              </Button>
                            );
                          }
                          
                          // Show ellipsis if there are more pages after
                          if (endPage < totalPages) {
                            if (endPage < totalPages - 1) {
                              pageNumbers.push(
                                <span key="ellipsis-end" className="px-1 text-slate-500 text-xs">
                                  ...
                                </span>
                              );
                            }
                            pageNumbers.push(
                              <Button
                                key={totalPages}
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage(totalPages)}
                                className="h-6 w-6 p-0 text-xs sm:h-8 sm:w-8 sm:text-sm"
                              >
                                {totalPages}
                              </Button>
                            );
                          }
                          
                          return pageNumbers;
                        })()}
                        
                        {/* Next Page */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                          className="h-6 w-6 p-0 sm:h-8 sm:w-8"
                        >
                          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <ChartGantt className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Projects</h3>
                <p className="text-slate-600 mb-4">
                  Projects will be created automatically after successful order payment.
                </p>
                <Link href="/services">
                  <Button>Browse Services</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}