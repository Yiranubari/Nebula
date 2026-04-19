import { Request, Response } from "express";
import { BaseController } from "../../core/BaseController";
import { AuthService } from "./auth.service";

export class AuthController extends BaseController {
  constructor(private readonly authService: AuthService) {
    super();
  }

  register = async (req: Request, res: Response) => {
    const result = await this.authService.register(req.body);
    this.created(res, result);
  };

  verifyOtp = async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken, message } = await this.authService.verifyOtp(req.body);
    this.setRefreshTokenCookie(res, refreshToken);
    this.ok(res, { message, user, accessToken });
  };

  resendOtp = async (req: Request, res: Response) => {
    const result = await this.authService.resendOtp(req.body);
    this.ok(res, result);
  };

  login = async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken } = await this.authService.login(req.body);
    this.setRefreshTokenCookie(res, refreshToken);
    this.ok(res, { user, accessToken });
  };

  forgotPassword = async (req: Request, res: Response) => {
    const result = await this.authService.forgotPassword(req.body);
    this.ok(res, result);
  };

  resetPassword = async (req: Request, res: Response) => {
    const result = await this.authService.resetPassword(req.body);
    this.ok(res, result);
  };

  refresh = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    if (!token) {
      res.status(401).json({
        status: "error",
        message: "No refresh token provided",
      });
      return;
    }

    const { user, accessToken, refreshToken } = await this.authService.refresh(token);
    this.setRefreshTokenCookie(res, refreshToken);
    this.ok(res, { user, accessToken });
  };

  logout = async (req: Request, res: Response) => {
    const token = req.cookies.refreshToken;
    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie("refreshToken", this.refreshCookieOptions());
    this.ok(res, { message: "Logged out successfully" });
  };

  invite = async (req: Request, res: Response) => {
    const result = await this.authService.invite(
      {
        id: req.user!.id,
        role: req.user!.role,
        name: req.user!.name,
        workspaceId: req.user!.workspaceId,
      },
      req.body
    );
    this.created(res, result);
  };

  completeInvite = async (req: Request, res: Response) => {
    const { user, accessToken, refreshToken, message } =
      await this.authService.completeInvite(req.body);
    this.setRefreshTokenCookie(res, refreshToken);
    this.ok(res, { message, user, accessToken });
  };

  /**
   * Cookie options that match the current environment.
   *
   *   - In **production** we assume the frontend and backend live on
   *     different origins (e.g. Vercel + Railway), so we need
   *     `SameSite=None` + `Secure` for the browser to attach the
   *     refresh-token cookie on cross-site XHRs.
   *   - In **development** both run on `localhost:*` which is same-site, so
   *     `SameSite=Lax` is fine and works without HTTPS.
   */
  private refreshCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: (isProd ? "none" : "lax") as "none" | "lax",
      path: "/",
    };
  }

  private setRefreshTokenCookie(res: Response, token: string) {
    res.cookie("refreshToken", token, {
      ...this.refreshCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });
  }
}
