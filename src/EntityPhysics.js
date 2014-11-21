var min = Math.min;
var max = Math.max;
var abs = Math.abs;
var sqrt = Math.sqrt;

// this value helps resolve colliding state between entities
var COLLISION_OFFSET = 0.001;

/**
 * IMPORTANT NOTES:
 * ~ all required functions to interface with Entity are labeled
 * ~ collisions support circles and axis-aligned rectangles only
 * ~ these are NOT continuous collision detection algorithms, meaning a large
 * value of dt could cause entities to pass through each other - it's up to the
 * developer to manage the time step of his/her game to prevent this behavior
 * ~ collisions use entities' x, y, and hitBounds properties; more info on
 * hitBounds can be found within Entity.js
 */
exports = {
	/**
	 * ~ REQUIRED for Entity
	 * ~ stepPosition updates an entity's position based on dt (delta time)
	 * ~ velocity is added half before update and half after, which helps
	 * mitigate lag spikes, for smoother, more frame independent animations
	 */
	stepPosition: function(entity, dt) {
		entity.x += dt * entity.vx / 2;
		entity.vx += dt * entity.ax;
		entity.x += dt * entity.vx / 2;

		entity.y += dt * entity.vy / 2;
		entity.vy += dt * entity.ay;
		entity.y += dt * entity.vy / 2;
	},
	/**
	 * ~ REQUIRED for Entity
	 * ~ collide defines how collisions behave and what data is returned
	 * ~ by default, returns a bool, and only works with circles and rects
	 */
	collide: function(entity1, entity2) {
		if (entity1.isCircle) {
			if (entity2.isCircle) {
				return this.circleCollidesWithCircle(entity1, entity2);
			} else {
				return this.circleCollidesWithRect(entity1, entity2);
			}
		} else {
			if (entity2.isCircle) {
				return this.circleCollidesWithRect(entity2, entity1);
			} else {
				return this.rectCollidesWithRect(entity1, entity2);
			}
		}
	},
	circleCollidesWithCircle: function(circ1, circ2) {
		var b1 = circ1.hitBounds;
		var x1 = circ1.x + b1.x;
		var y1 = circ1.y + b1.y;
		var r1 = b1.r;

		var b2 = circ2.hitBounds;
		var x2 = circ2.x + b2.x;
		var y2 = circ2.y + b2.y;
		var r2 = b2.r;

		var dx = x2 - x1;
		var dy = y2 - y1;
		var distSqrd = dx * dx + dy * dy;
		var distColl = r1 + r2;
		var distCollSqrd = distColl * distColl;

		return distSqrd <= distCollSqrd;
	},
	circleCollidesWithRect: function(circ, rect) {
		var cb = circ.hitBounds;
		var cx = circ.x + cb.x;
		var cy = circ.y + cb.y;
		var cr = cb.r;

		var rb = rect.hitBounds;
		var rwHalf = rb.w / 2;
		var rhHalf = rb.h / 2;
		var rx = rect.x + rb.x + rwHalf;
		var ry = rect.y + rb.y + rhHalf;

		var dx = abs(cx - rx);
		var dy = abs(cy - ry);

		if (dx > rwHalf + cr || dy > rhHalf + cr) {
			// far case: circle's center is too far from rect's center
			return false;
		} else if (dx <= rwHalf || dy <= rhHalf) {
			// close case: circle's center is close enough to rect's center
			return true;
		} else {
			// corner case: rect corner within a radius of the circle's center
			var dcx = dx - rwHalf;
			var dcy = dy - rhHalf;
			var cornerDistSqrd = dcx * dcx + dcy * dcy;
			return cornerDistSqrd <= cr * cr;
		}
	},
	rectCollidesWithRect: function(rect1, rect2) {
		var b1 = rect1.hitBounds;
		var x1 = rect1.x + b1.x;
		var y1 = rect1.y + b1.y;
		var xf1 = x1 + b1.w;
		var yf1 = y1 + b1.h;

		var b2 = rect2.hitBounds;
		var x2 = rect2.x + b2.x;
		var y2 = rect2.y + b2.y;
		var xf2 = x2 + b2.w;
		var yf2 = y2 + b2.h;

		return x1 <= xf2 && xf1 >= x2 && y1 <= yf2 && yf1 >= y2;
	},
	/**
	 * ~ REQUIRED for Entity
	 * ~ resolveCollidingState uses hitBounds to guarantee that two entities
	 * are no longer colliding by pushing them apart
	 * ~ entities with isAnchored true are never moved
	 * ~ returns total distance moved to separate the objects
	 */
	resolveCollidingState: function(entity1, entity2) {
		if (entity1.isCircle) {
			if (entity2.isCircle) {
				return this.resolveCollidingCircles(entity1, entity2);
			} else {
				return this.resolveCollidingCircleRect(entity1, entity2);
			}
		} else {
			if (entity2.isCircle) {
				return this.resolveCollidingCircleRect(entity2, entity1);
			} else {
				return this.resolveCollidingRects(entity1, entity2);
			}
		}
	},
	/**
	 * ~ resolveCollidingCircles forces two circles apart based on their centers
	 */
	resolveCollidingCircles: function(circ1, circ2) {
		var b1 = circ1.hitBounds;
		var x1 = circ1.x + b1.x;
		var y1 = circ1.y + b1.y;
		var r1 = b1.r;
		var mult1 = 0.5;

		var b2 = circ2.hitBounds;
		var x2 = circ2.x + b2.x;
		var y2 = circ2.y + b2.y;
		var r2 = b2.r;
		var mult2 = 0.5;

		var dx = x2 - x1;
		var dy = y2 - y1;
		var dist = sqrt(dx * dx + dy * dy);
		var distColl = r1 + r2 + COLLISION_OFFSET;

		// if concentric, force a very small distance
		if (dist === 0) {
			dx = COLLISION_OFFSET;
			dist = COLLISION_OFFSET;
		}

		// anchored entities cannot be moved by physics
		var dd = distColl - dist;
		if (circ1.isAnchored && circ2.isAnchored) {
			dd = 0;
		} else if (circ1.isAnchored) {
			mult1 = 0;
			mult2 = 1;
		} else if (circ2.isAnchored) {
			mult1 = 1;
			mult2 = 0;
		}

		circ1.x += mult1 * dd * -(dx / dist);
		circ1.y += mult1 * dd * -(dy / dist);
		circ2.x += mult2 * dd * (dx / dist);
		circ2.y += mult2 * dd * (dy / dist);

		return dd;
	},
	/**
	 * ~ resolveCollidingCircleRect forces apart a circle and rect, but only
	 * in one direction
	 * ~ good default collision behavior for landing on a platforms vs.
	 * hitting the side (missing the platform)
	 */
	resolveCollidingCircleRect: function(circ, rect) {

	},
	/**
	 * ~ resolveCollidingRects forces two rects apart, but only in one direction
	 * ~ good default collision behavior for landing on a platforms vs.
	 * hitting the side (missing the platform)
	 */
	resolveCollidingRects: function(rect1, rect2) {
		var b1 = rect1.hitBounds;
		var x1 = rect1.x + b1.x;
		var y1 = rect1.y + b1.y;
		var w1 = b1.w;
		var h1 = b1.h;
		var xf1 = x1 + w1;
		var yf1 = y1 + h1;
		var mult1 = 0.5;

		var b2 = rect2.hitBounds;
		var x2 = rect2.x + b2.x;
		var y2 = rect2.y + b2.y;
		var w2 = b2.w;
		var h2 = b2.h;
		var xf2 = x2 + w2;
		var yf2 = y2 + h2;
		var mult2 = 0.5;

		// find shallowest collision overlap, positive value means no overlap
		var dx = 1;
		var dx1 = x1 - xf2;
		var dx2 = x2 - xf1;
		if (dx1 <= 0 && dx2 <= 0) {
			dx = max(dx1, dx2) - COLLISION_OFFSET;
		} else if (dx1 <= 0) {
			dx = dx1 - COLLISION_OFFSET;
		} else if (dx2 <= 0) {
			dx = dx2 - COLLISION_OFFSET;
		}

		var dy = 1;
		var dy1 = y1 - yf2;
		var dy2 = y2 - yf1;
		if (dy1 <= 0 && dy2 <= 0) {
			dy = max(dy1, dy2) - COLLISION_OFFSET;
		} else if (dy1 <= 0) {
			dy = dy1 - COLLISION_OFFSET;
		} else if (dy2 <= 0) {
			dy = dy2 - COLLISION_OFFSET;
		}

		// step out in only one direction, pick the smallest overlap
		if (dx <= 0 && dy <= 0) {
			if (dx > dy) {
				dy = 0;
			} else {
				dx = 0;
			}
		} else if (dx <= 0) {
			dy = 0;
		} else if (dy <= 0) {
			dx = 0;
		} else {
			// there was no collision to begin with
			dx = 0;
			dy = 0;
		}

		// anchored entities cannot be moved by physics
		if (rect1.isAnchored && rect2.isAnchored) {
			dx = 0;
			dy = 0;
		} else if (rect1.isAnchored) {
			mult1 = 0;
			mult2 = 1;
		} else if (rect2.isAnchored) {
			mult1 = 1;
			mult2 = 0;
		}

		// dx and dy are never positive; so fix signs here based on rect centers
		var cx1 = x1 + w1 / 2;
		var cx2 = x2 + w2 / 2;
		var cy1 = y1 + h1 / 2;
		var cy2 = y2 + h2 / 2;
		var sign = (dx && cx1 > cx2) || (dy && cy1 > cy2) ? -1 : 1;
		rect1.x += mult1 * sign * dx;
		rect1.y += mult1 * sign * dy;
		rect2.x += mult2 * sign * -dx;
		rect2.y += mult2 * sign * -dy;

		// one of these will always be 0, so this is also the delta distance
		return dx + dy;
	}
};
