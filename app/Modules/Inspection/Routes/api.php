<?php

declare(strict_types=1);

use App\Core\Router;
use App\Modules\Auth\Middleware\AuthenticatedUserMiddleware;
use App\Modules\Inspection\Controllers\InspectionController;

return static function (Router $router): void {
    $router->get('/api/inspection-templates', [InspectionController::class, 'templates']);
    $router->get('/api/cars/{car_id}/inspection-report', [InspectionController::class, 'detailByCar']);

    $router->group('/api/cars/{car_id}/inspection-reports', static function (Router $router): void {
        $router->post('', [InspectionController::class, 'createReport']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/seller/cars/{car_id}', static function (Router $router): void {
        $router->get('/inspection-report', [InspectionController::class, 'detailByCar']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/seller/inspection', static function (Router $router): void {
        $router->get('/overview', [InspectionController::class, 'sellerOverview']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/admin/inspection-templates', static function (Router $router): void {
        $router->get('', [InspectionController::class, 'adminTemplates']);
        $router->post('', [InspectionController::class, 'createTemplate']);
        $router->patch('/{template_id}', [InspectionController::class, 'updateTemplate']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/admin/cars/{car_id}', static function (Router $router): void {
        $router->get('/inspection-report', [InspectionController::class, 'detailByCar']);
    }, [AuthenticatedUserMiddleware::class]);

    $router->group('/api/inspection-reports', static function (Router $router): void {
        $router->patch('/{report_id}', [InspectionController::class, 'updateReport']);
        $router->post('/{report_id}/items', [InspectionController::class, 'createItem']);
        $router->patch('/{report_id}/items/{item_id}', [InspectionController::class, 'updateItem']);
    }, [AuthenticatedUserMiddleware::class]);
};
