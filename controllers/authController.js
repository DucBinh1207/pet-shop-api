// controllers/authController.js
const authBO = require("../BO/authBO");

exports.login = async (req, res) => {
    const { email, password, isRememberMe } = req.body;

    try {
        const result = await authBO.loginUser(email, password, isRememberMe);

        if (result.success) {
            // Thành công, trả về token và thông tin người dùng
            res.status(200).json({
                token: result.token,
                email: result.email,
                id_role: result.id_role,
            });
        } else {
            // Lỗi, trả về status và message
            res.status(result.status).json({ message: result.message });
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.register = async (req, res) => {
    const { email, id_role } = req.body;
    try {
        const result = await authBO.registerUser(email, id_role);

        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(401).json({ message: result.message });
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.logout = async (req, res) => {
    const token = req.token;
    try {
        const result = await authBO.logOutUser(token);

        if (result.success) {
            res.status(200).json();
        } else {
            return res.status(401).json({
                success: false,
                message: "Token has expired. Please request a new token.",
            });
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
};

exports.verifyToken = async (req, res) => {
    const { token } = req.body;
    try {
        const result = await authBO.verifyToken(token);

        if (result.success) {
            res.status(200).json();
        } else {
            res.status(result.status).json({ message: result.message });
        }
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.forgotPassword = async (req, res) => {
    const { email } = req.body;
    try {
        const result = await authBO.forgotPassword(email);

        res.status(result.status).json({ message: result.message });
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}

exports.changePassword = async (req, res) => {
    const { token, password } = req.body;
    try {
        const result = await authBO.changePassword(token, password);

        if(result.status === 500){
            res.status(result.status).json({ message: result.message, error:result.error });
        }else{
            res.status(result.status).json({ message: result.message});
        }
        
    } catch (err) {
        console.error(err);
        // Lỗi server
        res.status(500).json({ message: "Internal server error" });
    }
}
