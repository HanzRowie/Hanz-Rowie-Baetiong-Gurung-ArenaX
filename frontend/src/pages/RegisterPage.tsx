import { Link } from 'react-router-dom';
import { Eye, EyeOff, User, Lock, Phone, Mail, AlertCircle, ChevronDown, Upload, X, FileText } from 'lucide-react';
import { useState, type FormEvent, type ChangeEvent } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole, type UserRole as UserRoleType } from '@/types/auth.types';

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRoleType>(UserRole.PLAYER);
  
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone_number: '',
    password: '',
    confirmPassword: '',
  });

  // Document upload states
  const [businessDocument, setBusinessDocument] = useState<File | null>(null);
  const [certificationDocument, setCertificationDocument] = useState<File | null>(null);

  const { register, isLoading, error } = useAuth();

  // Handle business document upload
  const handleBusinessDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBusinessDocument(file);
    }
  };

  // Handle certification document upload
  const handleCertificationDocumentChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCertificationDocument(file);
    }
  };

  // Reset document fields when role changes
  const handleRoleChange = (role: UserRoleType) => {
    setSelectedRole(role);
    setBusinessDocument(null);
    setCertificationDocument(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      alert('Passwords do not match!');
      return;
    }

    // Validate role-specific documents
    if (selectedRole === UserRole.VENUE_OWNER) {
      if (!businessDocument) {
        alert('Please upload your business document (registration/license/certificate)');
        return;
      }
    }

    if (selectedRole === UserRole.ORGANIZER || selectedRole === UserRole.REFEREE) {
      if (!certificationDocument) {
        alert('Please upload your certification document');
        return;
      }
    }

    try {
      // Create FormData for file upload
      const registrationData = new FormData();
      registrationData.append('email', formData.email);
      registrationData.append('full_name', formData.full_name);
      registrationData.append('phone_number', formData.phone_number);
      registrationData.append('password', formData.password);
      registrationData.append('role', selectedRole);

      // Add business document for venue owners
      if (selectedRole === UserRole.VENUE_OWNER && businessDocument) {
        registrationData.append('business_document', businessDocument);
      }

      // Add certification document
      if (selectedRole === UserRole.ORGANIZER || selectedRole === UserRole.REFEREE) {
        if (certificationDocument) {
          registrationData.append('certification_document', certificationDocument);
        }
      }

      const result = await register(registrationData);
      
      if (result?.success && result.otp) {
        // Show OTP in development mode
        alert(`Registration successful! Your verification code is: ${result.otp}\n\n(This is only shown in development mode)`);
      }
    } catch (err) {
      // Error is handled by the hook
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex">
        {/* Left Panel - Illustration */}
        <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-50 to-blue-50 items-center justify-center p-12">
          <img
            src="/images/Registration-Illustration.png"
            alt="Registration Illustration"
            className="w-full h-auto max-w-md"
          />
        </div>

        {/* Right Panel - Form */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 overflow-y-auto max-h-screen">
          {/* Logo */}
          <div className="flex items-center mb-6">
            <img 
              src="/images/Logo.jpg" 
              alt="ArenaX Logo" 
              className="h-10 w-10 object-contain rounded-lg mr-3"
            />
            <span className="text-2xl font-bold text-gray-900">ArenaX</span>
          </div>

          {/* Welcome Text */}
          <div className="mb-6">
            <h2 className="text-sm text-gray-500 mb-2">Welcome !</h2>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sign up to ArenaX
            </h1>
            <p className="text-gray-600">Find the best way to play</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter your email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Full Name Field */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="fullName"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Enter your full name"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Phone Number Field */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="Enter your phone number"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter your Password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your Password"
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Role Selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                I am a
              </label>
              <div className="relative">
                <select
                  id="role"
                  value={selectedRole}
                  onChange={(e) => handleRoleChange(e.target.value as UserRoleType)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all bg-white appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={isLoading}
                >
                  {Object.values(UserRole).filter(role => role !== UserRole.ADMIN).map((role) => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Venue Owner Document Upload */}
            {selectedRole === UserRole.VENUE_OWNER && (
              <>
                {/* Business Document Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Official Business Document <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">(Registration/License/Certificate)</span>
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-400 transition-colors">
                    <input
                      type="file"
                      id="business-document"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleBusinessDocumentChange}
                      className="hidden"
                      disabled={isLoading}
                    />
                    <label
                      htmlFor="business-document"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {businessDocument ? businessDocument.name : 'Click to upload official document'}
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        PDF, DOC, or Image files
                      </span>
                    </label>
                  </div>
                  {businessDocument && (
                    <div className="mt-2 flex items-center justify-between bg-purple-50 p-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-purple-600" />
                        <span className="text-sm text-gray-700">{businessDocument.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBusinessDocument(null)}
                        className="text-red-500 hover:text-red-700"
                        disabled={isLoading}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    Upload your business registration, license, or official certificate. Venue images can be added later when creating individual venues.
                  </p>
                </div>
              </>
            )}

            {/* Organizer/Referee Certification Upload */}
            {(selectedRole === UserRole.ORGANIZER || selectedRole === UserRole.REFEREE) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Certification Document <span className="text-red-500">*</span>
                  <span className="text-xs text-gray-500 ml-2">
                    ({selectedRole === UserRole.ORGANIZER ? 'Organizer' : 'Referee'} Certification)
                  </span>
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-purple-400 transition-colors">
                  <input
                    type="file"
                    id="certification-document"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={handleCertificationDocumentChange}
                    className="hidden"
                    disabled={isLoading}
                  />
                  <label
                    htmlFor="certification-document"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-600">
                      {certificationDocument ? certificationDocument.name : 'Click to upload certification'}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      PDF, DOC, or Image files
                    </span>
                  </label>
                </div>
                {certificationDocument && (
                  <div className="mt-2 flex items-center justify-between bg-purple-50 p-2 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-purple-600" />
                      <span className="text-sm text-gray-700">{certificationDocument.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCertificationDocument(null)}
                      className="text-red-500 hover:text-red-700"
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Player Info Message */}
            {selectedRole === UserRole.PLAYER && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Your account will need to be approved by an administrator before you can access the platform.
                </p>
              </div>
            )}

            {/* Register Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all font-semibold text-lg shadow-lg mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creating Account...' : 'Register'}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <span className="text-gray-600">Already have an Account ? </span>
            <Link to="/login" className="text-purple-600 hover:text-purple-700 font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
