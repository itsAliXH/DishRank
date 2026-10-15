import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import {
  AdminAssignOwnerDto,
  AdminApproveDishDto,
  AdminApproveRestaurantDto,
  AdminBulkUpdateCitiesDto,
  AdminCreateCityDto,
  AdminCreateDishDto,
  AdminCreateRestaurantDto,
  AdminCreateUserDto,
  AdminSetPasswordDto,
  AdminSetUserStatusDto,
  AdminUpdateCityDto,
  AdminUpdateDishCategoryDto,
  AdminUpdateDishImageDto,
  AdminUpdateRestaurantDto,
  AdminUpdateRestaurantImageDto,
  AdminUpdateRestaurantPermissionsDto,
  AdminUpdateUserDto,
  UpdateContentStatusDto,
} from './admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('pending')
  getPending() {
    return this.adminService.getPending();
  }

  @Get('stats')
  getStats(
    @Query('province') province?: string,
    @Query('cityId') cityId?: string,
  ) {
    return this.adminService.getDashboardStats({ province, cityId });
  }

  @Get('restaurants')
  listRestaurants() {
    return this.adminService.listRestaurants();
  }

  @Get('permissions')
  listPermissions() {
    return this.adminService.listRestaurantPermissions();
  }

  @Patch('restaurants/:id/permissions')
  updatePermissions(
    @Param('id') id: string,
    @Body() dto: AdminUpdateRestaurantPermissionsDto,
  ) {
    return this.adminService.updateRestaurantPermissions(id, dto);
  }

  @Get('catalog')
  listCatalog() {
    return this.adminService.listRestaurantsWithDishes();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Get('cities')
  listCities() {
    return this.adminService.listCities();
  }

  @Post('cities')
  createCity(@Body() dto: AdminCreateCityDto) {
    return this.adminService.createCity(dto);
  }

  @Patch('cities/bulk')
  bulkUpdateCities(@Body() dto: AdminBulkUpdateCitiesDto) {
    return this.adminService.bulkUpdateCities(dto);
  }

  @Patch('cities/:id')
  updateCity(@Param('id') id: string, @Body() dto: AdminUpdateCityDto) {
    return this.adminService.updateCity(id, dto);
  }

  @Post('users')
  createUser(@Body() dto: AdminCreateUserDto) {
    return this.adminService.createUser(dto);
  }

  @Post('restaurants')
  createRestaurant(@Body() dto: AdminCreateRestaurantDto) {
    return this.adminService.createRestaurant(dto);
  }

  @Patch('restaurants/:id')
  updateRestaurant(@Param('id') id: string, @Body() dto: AdminUpdateRestaurantDto) {
    return this.adminService.updateRestaurant(id, dto);
  }

  @Post('restaurants/:id/dishes')
  createDish(@Param('id') id: string, @Body() dto: AdminCreateDishDto) {
    return this.adminService.createDish(id, dto);
  }

  @Patch('restaurants/:id/status')
  setRestaurantStatus(@Param('id') id: string, @Body() dto: UpdateContentStatusDto) {
    return this.adminService.setRestaurantStatus(id, dto.status);
  }

  @Patch('restaurants/:id/image')
  updateRestaurantImage(@Param('id') id: string, @Body() dto: AdminUpdateRestaurantImageDto) {
    return this.adminService.updateRestaurantImage(id, dto);
  }

  @Patch('dishes/:id/image')
  updateDishImage(@Param('id') id: string, @Body() dto: AdminUpdateDishImageDto) {
    return this.adminService.updateDishImage(id, dto);
  }

  @Patch('dishes/:id/category')
  updateDishCategory(@Param('id') id: string, @Body() dto: AdminUpdateDishCategoryDto) {
    return this.adminService.updateDishCategory(id, dto);
  }

  @Patch('restaurants/:id/owner')
  assignOwner(@Param('id') id: string, @Body() dto: AdminAssignOwnerDto) {
    return this.adminService.assignRestaurantOwner(id, dto.userId ?? null);
  }

  @Patch('dishes/:id/visibility')
  setDishVisibility(@Param('id') id: string, @Body() dto: UpdateContentStatusDto) {
    return this.adminService.setDishVisibility(id, dto.status);
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.updateUser(id, dto, req.user.id);
  }

  @Patch('users/:id/password')
  setUserPassword(@Param('id') id: string, @Body() dto: AdminSetPasswordDto) {
    return this.adminService.setUserPassword(id, dto.password);
  }

  @Patch('users/:id/status')
  setUserStatus(
    @Param('id') id: string,
    @Body() dto: AdminSetUserStatusDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.adminService.setUserStatus(id, dto.status, req.user.id);
  }

  @Delete('restaurants/:id')
  deleteRestaurant(@Param('id') id: string) {
    return this.adminService.deleteRestaurant(id);
  }

  @Delete('dishes/:id')
  deleteDish(@Param('id') id: string) {
    return this.adminService.deleteDish(id);
  }

  @Post('restaurants/:id/approve')
  approveRestaurant(@Param('id') id: string, @Body() dto: AdminApproveRestaurantDto) {
    return this.adminService.approveRestaurant(id, dto || {});
  }

  @Post('restaurants/:id/reject')
  rejectRestaurant(@Param('id') id: string) {
    return this.adminService.rejectRestaurant(id);
  }

  @Post('dishes/:id/approve')
  approveDish(@Param('id') id: string, @Body() dto: AdminApproveDishDto) {
    return this.adminService.approveDish(id, dto || {});
  }

  @Post('dishes/:id/reject')
  rejectDish(@Param('id') id: string) {
    return this.adminService.rejectDish(id);
  }

  @Post('reviews/:id/approve')
  approveReview(@Param('id') id: string) {
    return this.adminService.approveReview(id);
  }

  @Post('reviews/:id/reject')
  rejectReview(@Param('id') id: string) {
    return this.adminService.rejectReview(id);
  }

  @Get('reviews')
  listReviews(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('verified') verified?: string,
    @Query('province') province?: string,
    @Query('cityId') cityId?: string,
    @Query('restaurantId') restaurantId?: string,
    @Query('dishId') dishId?: string,
  ) {
    return this.adminService.listReviews({
      q,
      status,
      verified,
      province,
      cityId,
      restaurantId,
      dishId,
    });
  }

  @Post('reviews/:id/hide')
  hideReview(@Param('id') id: string) {
    return this.adminService.hideReview(id);
  }

  @Post('reviews/:id/restore')
  restoreReview(@Param('id') id: string) {
    return this.adminService.restoreReview(id);
  }

  @Post('reviews/:id/unverify')
  unverifyReview(@Param('id') id: string) {
    return this.adminService.unverifyReview(id);
  }
}
