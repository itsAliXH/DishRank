import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { BookmarkService } from './bookmark.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

class ToggleBookmarkDto {
  @IsString()
  dishId: string;
}

@Controller('bookmarks')
@UseGuards(JwtAuthGuard)
export class BookmarkController {
  constructor(private bookmarkService: BookmarkService) {}

  @Get()
  list(@Req() req: { user: { id: string } }) {
    return this.bookmarkService.list(req.user.id);
  }

  @Get('ids')
  listIds(@Req() req: { user: { id: string } }) {
    return this.bookmarkService.listIds(req.user.id);
  }

  @Post('toggle')
  toggle(@Body() dto: ToggleBookmarkDto, @Req() req: { user: { id: string } }) {
    return this.bookmarkService.toggle(req.user.id, dto.dishId);
  }

  @Post(':dishId')
  save(@Param('dishId') dishId: string, @Req() req: { user: { id: string } }) {
    return this.bookmarkService.save(req.user.id, dishId);
  }

  @Delete(':dishId')
  unsave(@Param('dishId') dishId: string, @Req() req: { user: { id: string } }) {
    return this.bookmarkService.unsave(req.user.id, dishId);
  }
}
